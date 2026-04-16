import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionService } from '../promotions/promotion.service';
import {
  RequestQuoteDto,
  QuoteResponseDto,
} from './dto/request-quote.dto';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  private readonly QUOTE_TTL_SECONDS = parseInt(
    process.env.QUOTE_TTL_SECONDS || '20',
  );
  private readonly MAX_STAKE = parseFloat(
    process.env.MAX_STAKE_USD || '1000',
  );
  private readonly MAX_PAYOUT = parseFloat(
    process.env.MAX_PAYOUT_USD || '10000',
  );
  private readonly MAX_PARLAY_STAKE = parseFloat(
    process.env.MAX_PARLAY_STAKE_USD || '200',
  );
  private readonly MAX_PARLAY_PAYOUT = parseFloat(
    process.env.MAX_PARLAY_PAYOUT_USD || '50000',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionService: PromotionService,
  ) {}

  async requestQuote(dto: RequestQuoteDto): Promise<QuoteResponseDto> {
    if (dto.selections && dto.selections.length > 0) {
      return this.requestParlayQuote(dto);
    }
    if (!dto.selectionId) {
      throw new BadRequestException(
        'Either selectionId or selections must be provided',
      );
    }
    return this.requestSingleQuote(dto);
  }

  private async requestSingleQuote(
    dto: RequestQuoteDto,
  ): Promise<QuoteResponseDto> {
    const { stake, userId, promotionId } = dto;
    const selectionId = dto.selectionId!;

    if (stake <= 0 || stake > this.MAX_STAKE) {
      throw new BadRequestException(
        `Stake must be between 0 and ${this.MAX_STAKE}`,
      );
    }

    const selection = await this.prisma.selection.findUnique({
      where: { id: selectionId },
      include: {
        market: {
          include: { event: { include: { match: true } } },
        },
      },
    });
    if (!selection) throw new NotFoundException('Selection not found');
    this.validateSelectionReady(selection);

    await this.validateSelectionForQuote(selection, userId, selectionId);

    // Idempotencia
    const existing = await this.prisma.quote.findFirst({
      where: {
        userId,
        selectionId,
        status: 'PENDING',
        type: 'SINGLE',
        expiresAt: { gt: new Date() },
      },
    });
    if (existing) {
      return this.buildSingleResponse(existing, selection, selection.market.event);
    }

    // Validar odds drift
    const freshOdds = await this.getLatestOddsForSelection(selection);
    const oddsDrift =
      Math.abs(freshOdds - (selection.oddsValue ?? 0)) /
      (selection.oddsValue ?? 1);
    if (oddsDrift > 0.05) {
      await this.prisma.selection.update({
        where: { id: selectionId },
        data: { oddsValue: freshOdds },
      });
      throw new BadRequestException(
        JSON.stringify({
          code: 'ODDS_CHANGED',
          newOdds: freshOdds,
          message: 'Odds have changed. Please review and resubmit.',
        }),
      );
    }

    // Promotion
    let effectiveOdds = selection.oddsValue ?? 0;
    let adjustedStake = stake;
    let isFreeBet = false;
    let freeBetAmount = 0;
    let appliedPromoId: string | null = null;
    if (promotionId) {
      const applied = await this.promotionService.applyPromotion({
        promotionId,
        userId,
        selectionId,
        stake,
      });
      appliedPromoId = applied.promotionId;
      adjustedStake = applied.adjustedStake;
      isFreeBet = applied.isFreeBet;
      freeBetAmount = applied.freeBetAmount;
      if (applied.boostedOdds != null) effectiveOdds = applied.boostedOdds;
    }

    const expectedPayout = stake * effectiveOdds;
    if (expectedPayout > this.MAX_PAYOUT) {
      throw new BadRequestException(
        `Payout would exceed maximum of ${this.MAX_PAYOUT}`,
      );
    }

    const expiresAt = new Date(Date.now() + this.QUOTE_TTL_SECONDS * 1000);
    const quote = await this.prisma.quote.create({
      data: {
        selectionId,
        userId,
        stake,
        oddsAtQuote: effectiveOdds,
        expectedPayout,
        status: 'PENDING',
        type: 'SINGLE',
        expiresAt,
        txParams: this.buildTxParams({
          stake: adjustedStake,
          userId,
          quoteId: '',
        }),
        promotionId: appliedPromoId,
        isFreeBet,
        freeBetAmount: isFreeBet ? freeBetAmount : null,
      },
    });

    const txParams = this.buildTxParams({
      stake: adjustedStake,
      userId,
      quoteId: quote.id,
    });
    await this.prisma.quote.update({
      where: { id: quote.id },
      data: { txParams },
    });

    return this.buildSingleResponse(
      { ...quote, txParams },
      selection,
      selection.market.event,
    );
  }

  private async requestParlayQuote(
    dto: RequestQuoteDto,
  ): Promise<QuoteResponseDto> {
    const { selections, stake, userId } = dto;
    if (!selections || selections.length < 2) {
      throw new BadRequestException('Parlay requires at least 2 selections');
    }
    if (selections.length > 8) {
      throw new BadRequestException('Parlay maximum is 8 selections');
    }
    if (stake > this.MAX_PARLAY_STAKE) {
      throw new BadRequestException(
        `Parlay stake max is ${this.MAX_PARLAY_STAKE}`,
      );
    }

    // Load selections
    const loaded = await Promise.all(
      selections.map((s) =>
        this.prisma.selection.findUnique({
          where: { id: s.selectionId },
          include: {
            market: {
              include: { event: { include: { match: true } } },
            },
          },
        }),
      ),
    );

    for (let i = 0; i < loaded.length; i++) {
      if (!loaded[i]) {
        throw new NotFoundException(
          `Selection ${selections[i].selectionId} not found`,
        );
      }
    }
    const loadedSelections = loaded as NonNullable<(typeof loaded)[number]>[];

    // No same-match
    const matchIds = loadedSelections.map((s) => s.market.event.matchId);
    if (new Set(matchIds).size !== matchIds.length) {
      throw new BadRequestException(
        'Cannot combine two selections from the same match',
      );
    }

    // Allowed market types for parlays (v1)
    for (const sel of loadedSelections) {
      if (
        sel.market.type !== 'MATCH_WINNER' &&
        sel.market.type !== 'OVER_UNDER'
      ) {
        throw new BadRequestException(
          `Parlays only support MATCH_WINNER and OVER_UNDER in v1`,
        );
      }
      this.validateSelectionReady(sel);
      await this.validateSelectionForQuote(sel, userId, sel.id);
    }

    // Combined odds
    const combinedOdds = loadedSelections.reduce(
      (acc, s) => acc * (s.oddsValue ?? 1),
      1,
    );

    const expectedPayout = stake * combinedOdds;
    if (expectedPayout > this.MAX_PARLAY_PAYOUT) {
      throw new BadRequestException(
        `Parlay payout would exceed maximum of ${this.MAX_PARLAY_PAYOUT}`,
      );
    }

    const expiresAt = new Date(Date.now() + this.QUOTE_TTL_SECONDS * 1000);
    const quote = await this.prisma.quote.create({
      data: {
        userId,
        stake,
        oddsAtQuote: combinedOdds,
        expectedPayout,
        status: 'PENDING',
        type: 'PARLAY',
        expiresAt,
        txParams: this.buildTxParams({ stake, userId, quoteId: '' }),
        parlayLegs: {
          create: loadedSelections.map((s) => ({
            selectionId: s.id,
            oddsValue: s.oddsValue ?? 0,
          })),
        },
      },
      include: { parlayLegs: true },
    });

    const txParams = this.buildTxParams({
      stake,
      userId,
      quoteId: quote.id,
    });
    await this.prisma.quote.update({
      where: { id: quote.id },
      data: { txParams },
    });

    return {
      quoteId: quote.id,
      type: 'PARLAY',
      stake,
      oddsAtQuote: combinedOdds,
      expectedPayout,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: this.QUOTE_TTL_SECONDS,
      txParams: {
        to: txParams.to,
        value: txParams.value,
        data: txParams.data,
        quoteId: txParams.quoteId,
      },
      legs: loadedSelections.map((s) => ({
        selectionId: s.id,
        matchHomeTeam: s.market.event.match.homeTeam,
        matchAwayTeam: s.market.event.match.awayTeam,
        selectionName: s.name,
        oddsValue: s.oddsValue ?? 0,
      })),
    };
  }

  private validateSelectionReady(selection: any): void {
    if (selection.oddsValue == null) {
      throw new BadRequestException(
        'Selection has no odds available — market may be suspended',
      );
    }
  }

  private async validateSelectionForQuote(
    selection: any,
    _userId: string,
    _selectionId: string,
  ): Promise<void> {
    if (selection.market.status !== 'ACTIVE') {
      throw new BadRequestException('Market is suspended or closed');
    }
    const event = selection.market.event;
    if (event.status !== 'ACTIVE') {
      throw new BadRequestException('Event is not accepting bets');
    }
    const lockTime = new Date(event.lockTime);
    const lockTimeWithBuffer = new Date(lockTime.getTime() - 2000);
    if (new Date() >= lockTimeWithBuffer) {
      await this.prisma.sportsbookEvent.update({
        where: { id: event.id },
        data: { status: 'SUSPENDED' },
      });
      throw new BadRequestException(
        'Event is locked — too close to start time',
      );
    }
  }

  private buildSingleResponse(
    quote: any,
    selection: any,
    event: any,
  ): QuoteResponseDto {
    const txParams = quote.txParams as any;
    return {
      quoteId: quote.id,
      type: 'SINGLE',
      selectionId: quote.selectionId,
      stake: quote.stake,
      oddsAtQuote: quote.oddsAtQuote,
      expectedPayout: quote.expectedPayout,
      expiresAt: quote.expiresAt.toISOString(),
      ttlSeconds: this.QUOTE_TTL_SECONDS,
      txParams: {
        to: txParams.to,
        value: txParams.value,
        data: txParams.data,
        quoteId: txParams.quoteId,
      },
      match: {
        homeTeam: event.match.homeTeam,
        awayTeam: event.match.awayTeam,
        startTime: event.match.startTime,
        league: event.match.league,
      },
      selection: {
        name: selection.name,
        oddsValue: selection.oddsValue ?? 0,
      },
      isFreeBet: !!quote.isFreeBet,
      freeBetAmount: quote.freeBetAmount ?? undefined,
    };
  }

  private buildTxParams(params: {
    stake: number;
    userId: string;
    quoteId: string;
  }) {
    return {
      to:
        process.env.SPORTSBOOK_TREASURY_ADDRESS ||
        '0x0000000000000000000000000000000000000001',
      value: Math.floor(Math.max(0, params.stake) * 1e6).toString(),
      data: `0x${Buffer.from(params.quoteId).toString('hex')}`,
      quoteId: params.quoteId,
    };
  }

  private async getLatestOddsForSelection(selection: any): Promise<number> {
    const match = selection.market.event.match;
    const odds = await this.prisma.odds.findFirst({
      where: { matchId: match.id },
      orderBy: { lastUpdateAt: 'desc' },
    });
    if (!odds) return selection.oddsValue ?? 0;
    if (selection.name === 'home')
      return odds.homeWin ?? selection.oddsValue ?? 0;
    if (selection.name === 'away')
      return odds.awayWin ?? selection.oddsValue ?? 0;
    if (selection.name === 'draw')
      return odds.draw ?? selection.oddsValue ?? 0;
    return selection.oddsValue ?? 0;
  }
}
