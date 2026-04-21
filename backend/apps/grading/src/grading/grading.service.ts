/**
 * @module GradingService
 * @description Servicio principal de calificación (grading) de apuestas.
 *
 * Determina el resultado de cada apuesta (WIN, LOSS, VOID, REFUND, MANUAL_REVIEW)
 * basándose en los resultados oficiales obtenidos de la API de ESPN.
 *
 * Funcionalidades principales:
 * - Calificación de apuestas simples (singles) y combinadas (parlays).
 * - Soporte para múltiples tipos de mercado: MATCH_WINNER, OVER_UNDER,
 *   BOTH_TEAMS_TO_SCORE, DOUBLE_CHANCE, HALF_TIME_RESULT.
 * - Creación automática de trabajos de liquidación para pagos.
 * - Idempotencia: previene calificaciones duplicadas por ticket.
 * - Broadcast de actualizaciones de estado vía WebSocket.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@sportsbook/prisma';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

/**
 * Resultado oficial de un evento deportivo obtenido de ESPN.
 *
 * @interface OfficialResult
 */
interface OfficialResult {
  externalEventId: string;
  homeScore: number | null;
  awayScore: number | null;
  homeWinner: boolean | null;
  awayWinner: boolean | null;
  overUnderLine: number | null;
  homeLinescores: Array<{ period: number; value: number }> | null;
  awayLinescores: Array<{ period: number; value: number }> | null;
  cancelled: boolean;
  conflicting: boolean;
  fetchedAt: Date;
  raw: unknown;
}

type Outcome = 'WIN' | 'LOSS' | 'VOID' | 'REFUND' | 'MANUAL_REVIEW';

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    @InjectQueue('grading') private readonly gradingQueue: Queue,
  ) {}

  async gradeEvent(eventId: string): Promise<void> {
    const event = await this.prisma.sportsbookEvent.findUnique({
      where: { id: eventId },
      include: {
        match: { include: { odds: true } },
        markets: {
          include: {
            selections: {
              include: {
                quotes: {
                  where: {
                    status: 'ACCEPTED',
                    ticket: { status: 'CONFIRMED' },
                  },
                  include: {
                    ticket: { include: { gradingRecord: true } },
                  },
                },
                parlayLegs: {
                  where: {
                    outcome: null,
                    ticket: { status: 'CONFIRMED' },
                  },
                  include: {
                    ticket: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      this.logger.warn(`Event ${eventId} not found for grading`);
      return;
    }

    if (event.match.status !== 'FINISHED') {
      this.logger.warn(`Event ${eventId} match not finished yet, skipping`);
      return;
    }

    const result = await this.fetchOfficialResult(event.match as any);
    if (!result) {
      this.logger.error(
        `Could not fetch official result for match ${event.match.id}`,
      );
      return;
    }

    for (const market of event.markets) {
      for (const selection of market.selections) {
        const outcome = this.determineOutcome({
          selection,
          market,
          result,
        }) as Outcome;

        // Grade singles
        for (const quote of selection.quotes) {
          const ticket = quote.ticket;
          if (!ticket || ticket.gradingRecord) continue;
          await this.gradeTicket({
            ticket,
            quote,
            selection,
            market,
            outcome,
            result,
          });
        }

        // Grade parlay legs
        for (const leg of selection.parlayLegs) {
          if (leg.outcome) continue;
          await this.gradeParlayLeg({
            ticketId: leg.ticketId,
            selectionId: selection.id,
            outcome,
          });
        }
      }
    }
  }

  private async gradeTicket(params: {
    ticket: any;
    quote: any;
    selection: any;
    market: any;
    outcome: Outcome;
    result: OfficialResult;
  }): Promise<void> {
    const { ticket, quote, outcome, result } = params;

    let gradingRecord: any;
    try {
      gradingRecord = await this.prisma.gradingRecord.create({
        data: {
          ticketId: ticket.id,
          outcome: outcome as any,
          resultSource: 'ESPN_API',
          resultRaw: result as any,
          gradedBy: 'system',
          notes:
            outcome === 'MANUAL_REVIEW'
              ? `Unable to determine outcome automatically. Result: ${JSON.stringify(result)}`
              : null,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.warn(`Ticket ${ticket.id} already graded, skipping`);
        return;
      }
      throw err;
    }

    const newTicketStatus = this.outcomeToTicketStatus(outcome);
    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: newTicketStatus as any },
    });

    this.logger.log(`Ticket ${ticket.id} graded as ${outcome}`);

    if (outcome === 'WIN' || outcome === 'REFUND') {
      await this.createSettlementJob({
        ticket,
        quote,
        gradingRecord,
        outcome,
        amount: this.computeSinglePayout(quote, outcome),
      });
    }

    await this.broadcastTicketUpdate(ticket.id, ticket.userId, newTicketStatus);
  }

  async gradeParlayLeg(params: {
    ticketId: string;
    selectionId: string;
    outcome: Outcome;
  }): Promise<void> {
    const { ticketId, selectionId, outcome } = params;

    // Idempotent: skip if leg already graded
    const existingLeg = await this.prisma.parlayLeg.findUnique({
      where: { ticketId_selectionId: { ticketId, selectionId } },
    });
    if (!existingLeg) {
      this.logger.warn(
        `ParlayLeg ticket=${ticketId} selection=${selectionId} not found`,
      );
      return;
    }
    if (existingLeg.outcome) {
      this.logger.warn(
        `ParlayLeg ticket=${ticketId} selection=${selectionId} already graded`,
      );
      return;
    }

    await this.prisma.parlayLeg.update({
      where: { ticketId_selectionId: { ticketId, selectionId } },
      data: { outcome: outcome as any, gradedAt: new Date() },
    });

    // If LOSS on any leg → resolve parlay as LOSS immediately
    if (outcome === 'LOSS') {
      await this.resolveParlay(ticketId, 'LOSS');
      return;
    }

    const allLegs = await this.prisma.parlayLeg.findMany({
      where: { ticketId },
    });

    const pending = allLegs.filter((l) => !l.outcome);
    if (pending.length > 0) return;

    const hasLoss = allLegs.some((l) => l.outcome === 'LOSS');
    const allVoid = allLegs.every((l) => l.outcome === 'VOID');
    const activeLegs = allLegs.filter(
      (l) => l.outcome !== 'VOID' && l.outcome !== 'REFUND',
    );

    if (hasLoss) {
      await this.resolveParlay(ticketId, 'LOSS');
    } else if (allVoid) {
      await this.resolveParlay(ticketId, 'VOID');
    } else if (activeLegs.every((l) => l.outcome === 'WIN')) {
      await this.resolveParlay(ticketId, 'WIN');
    } else {
      await this.resolveParlay(ticketId, 'MANUAL_REVIEW');
    }
  }

  private async resolveParlay(
    ticketId: string,
    finalOutcome: Outcome,
  ): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        quote: true,
        parlayLegs: { include: { selection: true } },
      },
    });
    if (!ticket || !ticket.quote) {
      this.logger.warn(`Parlay ticket ${ticketId} not found for resolution`);
      return;
    }

    // Idempotency: skip if already has gradingRecord
    const existingGrading = await this.prisma.gradingRecord.findUnique({
      where: { ticketId },
    });
    if (existingGrading) {
      this.logger.warn(`Parlay ticket ${ticketId} already has grading record`);
      return;
    }

    let finalOdds = ticket.quote.oddsAtQuote;
    if (finalOutcome === 'WIN') {
      const active = ticket.parlayLegs.filter((l) => l.outcome === 'WIN');
      finalOdds = active.reduce((acc, l) => acc * l.oddsValue, 1);
    }

    const finalPayout =
      finalOutcome === 'WIN'
        ? ticket.quote.stake * finalOdds
        : finalOutcome === 'REFUND' || finalOutcome === 'VOID'
          ? ticket.quote.stake
          : 0;

    const gradingRecord = await this.prisma.gradingRecord.create({
      data: {
        ticketId,
        outcome: finalOutcome as any,
        resultSource: 'PARLAY_AUTO',
        gradedBy: 'system',
        notes: `Parlay resolved. Final odds: ${finalOdds.toFixed(4)}. Payout: ${finalPayout.toFixed(2)}`,
      },
    });

    const newStatus = this.outcomeToTicketStatus(finalOutcome);
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus as any },
    });

    this.logger.log(`Parlay ${ticketId} resolved as ${finalOutcome}`);

    if (
      finalOutcome === 'WIN' ||
      finalOutcome === 'VOID' ||
      finalOutcome === 'REFUND'
    ) {
      const settlementOutcome: Outcome =
        finalOutcome === 'VOID' ? 'REFUND' : finalOutcome;
      await this.createSettlementJob({
        ticket,
        quote: ticket.quote,
        gradingRecord,
        outcome: settlementOutcome,
        amount: finalPayout,
      });
    }

    await this.broadcastTicketUpdate(ticketId, ticket.userId, newStatus);
  }

  private computeSinglePayout(quote: any, outcome: Outcome): number {
    if (outcome === 'WIN') {
      // Free bet: only pays net winnings (payout - stake covered by promo)
      if (quote.isFreeBet && quote.freeBetAmount) {
        return Math.max(0, quote.expectedPayout - quote.freeBetAmount);
      }
      return quote.expectedPayout;
    }
    if (outcome === 'REFUND') return quote.stake;
    return 0;
  }

  private determineOutcome(params: {
    selection: any;
    market: any;
    result: OfficialResult;
  }): string {
    const { selection, market, result } = params;

    if (result.cancelled) return 'VOID';
    if (result.conflicting) return 'MANUAL_REVIEW';

    if (market.type === 'MATCH_WINNER') {
      if (result.homeScore === null || result.awayScore === null) return 'VOID';
      return this.gradeMatchWinner(selection.name, result);
    }

    if (market.type === 'OVER_UNDER') {
      return this.gradeOverUnder(selection.name, result);
    }

    if (market.type === 'BOTH_TEAMS_TO_SCORE') {
      if (result.homeScore === null || result.awayScore === null)
        return 'MANUAL_REVIEW';
      const bothScored = result.homeScore > 0 && result.awayScore > 0;
      if (selection.name === 'yes') return bothScored ? 'WIN' : 'LOSS';
      if (selection.name === 'no') return !bothScored ? 'WIN' : 'LOSS';
      return 'MANUAL_REVIEW';
    }

    if (market.type === 'DOUBLE_CHANCE') {
      if (result.homeScore === null || result.awayScore === null)
        return 'MANUAL_REVIEW';
      const homeWins = result.homeScore > result.awayScore;
      const awayWins = result.awayScore > result.homeScore;
      const draw = result.homeScore === result.awayScore;
      if (selection.name === '1X') return homeWins || draw ? 'WIN' : 'LOSS';
      if (selection.name === 'X2') return awayWins || draw ? 'WIN' : 'LOSS';
      if (selection.name === '12') return homeWins || awayWins ? 'WIN' : 'LOSS';
      return 'MANUAL_REVIEW';
    }

    if (market.type === 'HALF_TIME_RESULT') {
      const htHome = result.homeLinescores?.[0]?.value ?? null;
      const htAway = result.awayLinescores?.[0]?.value ?? null;
      if (htHome === null || htAway === null) return 'MANUAL_REVIEW';
      if (selection.name === 'home') return htHome > htAway ? 'WIN' : 'LOSS';
      if (selection.name === 'away') return htAway > htHome ? 'WIN' : 'LOSS';
      if (selection.name === 'draw') return htHome === htAway ? 'WIN' : 'LOSS';
      return 'MANUAL_REVIEW';
    }

    return 'MANUAL_REVIEW';
  }

  private gradeMatchWinner(
    selectionName: string,
    result: OfficialResult,
  ): string {
    const { homeScore, awayScore, homeWinner, awayWinner } = result;

    if (homeWinner !== null && awayWinner !== null) {
      if (selectionName === 'home') return homeWinner ? 'WIN' : 'LOSS';
      if (selectionName === 'away') return awayWinner ? 'WIN' : 'LOSS';
      if (selectionName === 'draw') {
        return !homeWinner && !awayWinner ? 'WIN' : 'LOSS';
      }
    }

    if (homeScore === null || awayScore === null) return 'MANUAL_REVIEW';

    if (selectionName === 'home') {
      if (homeScore > awayScore) return 'WIN';
      return 'LOSS';
    }
    if (selectionName === 'away') {
      if (awayScore > homeScore) return 'WIN';
      return 'LOSS';
    }
    if (selectionName === 'draw') {
      return homeScore === awayScore ? 'WIN' : 'LOSS';
    }

    return 'MANUAL_REVIEW';
  }

  private gradeOverUnder(
    selectionName: string,
    result: OfficialResult,
  ): string {
    const { homeScore, awayScore, overUnderLine } = result;
    if (homeScore === null || awayScore === null || overUnderLine === null) {
      return 'MANUAL_REVIEW';
    }
    const total = homeScore + awayScore;
    if (total === overUnderLine) return 'REFUND';
    if (selectionName === 'over') return total > overUnderLine ? 'WIN' : 'LOSS';
    if (selectionName === 'under')
      return total < overUnderLine ? 'WIN' : 'LOSS';
    return 'MANUAL_REVIEW';
  }

  private outcomeToTicketStatus(outcome: Outcome): string {
    const map: Record<string, string> = {
      WIN: 'WON',
      LOSS: 'LOST',
      VOID: 'VOID',
      REFUND: 'REFUNDED',
      MANUAL_REVIEW: 'MANUAL_REVIEW',
    };
    return map[outcome] ?? 'MANUAL_REVIEW';
  }

  private async fetchOfficialResult(
    match: any,
  ): Promise<OfficialResult | null> {
    try {
      const sportPath = this.buildEspnPath(match.sport, match.league);
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;

      const dateStr = new Date(match.startTime)
        .toISOString()
        .split('T')[0]
        .replace(/-/g, '');

      const response = await firstValueFrom(
        this.http.get(`${url}?dates=${dateStr}&limit=100`),
      );
      const data = response.data;

      const espnEvent = (data.events || []).find(
        (e: any) => e.id === match.externalId,
      );

      if (!espnEvent) {
        this.logger.warn(
          `ESPN event ${match.externalId} not found in scoreboard`,
        );
        return null;
      }

      const completed: boolean = espnEvent.status?.type?.completed === true;
      const state: string = espnEvent.status?.type?.state;

      if (!completed || state !== 'post') {
        this.logger.warn(
          `Match ${match.externalId} not yet in completed state`,
        );
        return null;
      }

      const comp = espnEvent.competitions?.[0];
      if (!comp) return null;

      const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away');

      if (!home || !away) return null;

      const overUnderLine = comp.odds?.[0]?.overUnder ?? null;

      const homeLinescores = (home.linescores || []).map(
        (l: any, i: number) => ({ period: i + 1, value: l.value }),
      );
      const awayLinescores = (away.linescores || []).map(
        (l: any, i: number) => ({ period: i + 1, value: l.value }),
      );

      return {
        externalEventId: match.externalId,
        homeScore: parseInt(home.score) ?? null,
        awayScore: parseInt(away.score) ?? null,
        homeWinner: home.winner ?? null,
        awayWinner: away.winner ?? null,
        overUnderLine,
        homeLinescores,
        awayLinescores,
        cancelled: false,
        conflicting: false,
        fetchedAt: new Date(),
        raw: espnEvent,
      };
    } catch (error: any) {
      this.logger.error(
        `Error fetching result for match ${match.externalId}:`,
        error?.message,
      );
      return null;
    }
  }

  private buildEspnPath(sport: string, league: string): string {
    const leagueMap: Record<string, string> = {
      NBA: 'basketball/nba',
      NHL: 'hockey/nhl',
      SOCCER: 'soccer/arg.1',
      LIBERTADORES: 'soccer/conmebol.libertadores',
      MLB: 'baseball/mlb',
      NFL: 'football/nfl',
      UCL: 'soccer/uefa.champions',
      EPL: 'soccer/eng.1',
    };
    return leagueMap[league] || `${sport}/${league.toLowerCase()}`;
  }

  private async createSettlementJob(params: {
    ticket: any;
    quote: any;
    gradingRecord: any;
    outcome: Outcome;
    amount: number;
  }): Promise<void> {
    const { ticket, gradingRecord, outcome, amount } = params;

    const idempotencyKey = this.generateIdempotencyKey(
      ticket.id,
      outcome,
      amount,
    );

    const existing = await this.prisma.settlementJob.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      this.logger.warn(
        `SettlementJob already exists for ticket ${ticket.id}, skipping`,
      );
      return;
    }

    await this.prisma.settlementJob.create({
      data: {
        ticketId: ticket.id,
        gradingRecordId: gradingRecord.id,
        idempotencyKey,
        amount,
        toWallet: ticket.userId,
        status: 'PENDING',
      },
    });

    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'SETTLING' },
    });

    this.logger.log(
      `SettlementJob created for ticket ${ticket.id}: ${amount} → ${ticket.userId}`,
    );
  }

  private generateIdempotencyKey(
    ticketId: string,
    outcome: string,
    amount: number,
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${ticketId}:${outcome}:${amount.toFixed(6)}`)
      .digest('hex');
  }

  private async broadcastTicketUpdate(
    ticketId: string,
    userId: string,
    status: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `http://localhost:${process.env.PORT_SPORTSBOOK_API || 3000}/internal/broadcast-ticket`,
          { ticketId, userId, status },
        ),
      );
    } catch {
      // non-critical
    }
  }
}
