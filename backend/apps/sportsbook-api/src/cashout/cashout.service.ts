import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface CashoutQuoteDto {
  ticketId: string;
  cashoutAmount: number;
  currentOdds: number;
  oddsAtBet: number;
  expiresAt: string;
}

@Injectable()
export class CashoutService {
  private readonly logger = new Logger(CashoutService.name);
  private readonly CASHOUT_TTL_SECONDS = 10;
  private readonly CASHOUT_MARGIN = parseFloat(
    process.env.CASHOUT_MARGIN || '0.05',
  );

  constructor(private readonly prisma: PrismaService) {}

  async getCashoutQuote(
    ticketId: string,
    userId: string,
  ): Promise<CashoutQuoteDto> {
    const ticket = await this.loadTicketForCashout(ticketId, userId);

    const selectionId = ticket.quote.selectionId;
    if (!selectionId) {
      throw new BadRequestException('Cashout not available for this ticket');
    }
    const currentOdds = await this.getCurrentOdds(selectionId);
    if (!currentOdds) {
      throw new BadRequestException('Current odds unavailable');
    }

    const rawAmount =
      ticket.quote.stake *
      (ticket.quote.oddsAtQuote / currentOdds) *
      (1 - this.CASHOUT_MARGIN);

    // Cap to 90% of stake maximum (safety cap) and floor at 0
    const cap = ticket.quote.stake * 0.9;
    const finalAmount = Math.max(0, Math.min(rawAmount, cap));
    const expiresAt = new Date(Date.now() + this.CASHOUT_TTL_SECONDS * 1000);

    return {
      ticketId,
      cashoutAmount: parseFloat(finalAmount.toFixed(2)),
      currentOdds,
      oddsAtBet: ticket.quote.oddsAtQuote,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async executeCashout(
    ticketId: string,
    userId: string,
    expectedAmount: number,
  ) {
    const ticket = await this.loadTicketForCashout(ticketId, userId);

    const selectionId = ticket.quote.selectionId;
    if (!selectionId) {
      throw new BadRequestException('Cashout not available for this ticket');
    }
    const currentOdds = await this.getCurrentOdds(selectionId);
    if (!currentOdds) {
      throw new BadRequestException('Current odds unavailable');
    }

    const rawAmount =
      ticket.quote.stake *
      (ticket.quote.oddsAtQuote / currentOdds) *
      (1 - this.CASHOUT_MARGIN);
    const cap = ticket.quote.stake * 0.9;
    const actualAmount = Math.max(0, Math.min(rawAmount, cap));

    // Drift check (>2% → reject)
    if (expectedAmount > 0) {
      const drift =
        Math.abs(actualAmount - expectedAmount) / expectedAmount;
      if (drift > 0.02) {
        throw new BadRequestException(
          JSON.stringify({
            code: 'CASHOUT_AMOUNT_CHANGED',
            newAmount: parseFloat(actualAmount.toFixed(2)),
            message: 'Cashout amount changed. Please review and resubmit.',
          }),
        );
      }
    }

    const gradingRecord = await this.prisma.gradingRecord.create({
      data: {
        ticketId,
        outcome: 'REFUND',
        resultSource: 'CASHOUT',
        gradedBy: 'user',
        notes: `User cashout at ${actualAmount.toFixed(2)} (current odds: ${currentOdds})`,
      },
    });

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`cashout:${ticketId}:${actualAmount.toFixed(6)}`)
      .digest('hex');

    await this.prisma.settlementJob.create({
      data: {
        ticketId,
        gradingRecordId: gradingRecord.id,
        idempotencyKey,
        amount: parseFloat(actualAmount.toFixed(2)),
        toWallet: ticket.userId,
        status: 'PENDING',
      },
    });

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'CASHED_OUT',
        cashedOutAt: new Date(),
        cashoutAmount: parseFloat(actualAmount.toFixed(2)),
      },
    });

    this.logger.log(
      `Ticket ${ticketId} cashed out for ${actualAmount.toFixed(2)}`,
    );

    return updated;
  }

  private async loadTicketForCashout(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        quote: {
          include: {
            selection: {
              include: { market: { include: { event: true } } },
            },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException();
    if (ticket.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Cannot cashout ticket in status ${ticket.status}`,
      );
    }
    if (ticket.quote.type === 'PARLAY') {
      throw new BadRequestException(
        'Cashout not available for parlays in v1',
      );
    }
    if (!ticket.quote.selection) {
      throw new BadRequestException('Ticket has no selection');
    }

    const event = ticket.quote.selection.market.event;
    if (new Date() >= new Date(event.lockTime)) {
      throw new BadRequestException(
        'Cashout not available — event already started',
      );
    }

    return ticket;
  }

  private async getCurrentOdds(selectionId: string): Promise<number | null> {
    const selection = await this.prisma.selection.findUnique({
      where: { id: selectionId },
    });
    return selection?.oddsValue ?? null;
  }
}
