import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@sportsbook/prisma';
import axios from 'axios';

export class SubmitBetDto {
  quoteId: string;
  txHash: string;
  userId: string;
}

@Injectable()
export class BetExecutionService {
  private readonly logger = new Logger(BetExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('confirmation') private readonly confirmationQueue: Queue,
  ) {}

  async submitBet(dto: SubmitBetDto) {
    const { quoteId, txHash, userId } = dto;

    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { ticket: true, parlayLegs: true },
    });

    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.userId !== userId) throw new ForbiddenException();
    if (quote.status === 'EXPIRED' || new Date() > quote.expiresAt) {
      await this.prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Quote has expired');
    }
    if (quote.ticket) throw new ConflictException('Quote already has a ticket');

    const ticket = await this.prisma.ticket.create({
      data: {
        quoteId,
        userId,
        txHash,
        status: 'SUBMITTED',
        type: quote.type,
        promotionId: quote.promotionId,
        isFreeBet: quote.isFreeBet,
        freeBetAmount: quote.freeBetAmount,
        parlayLegs:
          quote.type === 'PARLAY'
            ? {
                create: quote.parlayLegs.map((l) => ({
                  selectionId: l.selectionId,
                  quoteId: quote.id,
                  oddsValue: l.oddsValue,
                })),
              }
            : undefined,
      },
    });

    if (quote.promotionId) {
      try {
        await this.prisma.$transaction([
          this.prisma.promotionRedemption.create({
            data: {
              promotionId: quote.promotionId,
              userId,
              ticketId: ticket.id,
            },
          }),
          this.prisma.promotion.update({
            where: { id: quote.promotionId },
            data: { usedCount: { increment: 1 } },
          }),
        ]);
      } catch (err: any) {
        this.logger.warn(
          `Promotion ${quote.promotionId} redemption failed: ${err?.message}`,
        );
      }
    }

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'ACCEPTED' },
    });

    await this.confirmationQueue.add(
      'confirm-tx',
      { ticketId: ticket.id, txHash, userId, attempt: 1 },
      { delay: 3000 },
    );

    this.notifySportsbookApi(ticket.id, userId, 'SUBMITTED');

    return ticket;
  }

  async getTicket(ticketId: string) {
    return this.prisma.ticket.findUnique({ where: { id: ticketId } });
  }

  private notifySportsbookApi(
    ticketId: string,
    userId: string,
    status: string,
  ) {
    const apiUrl =
      process.env.SPORTSBOOK_API_URL || 'http://127.0.0.1:3000';
    axios
      .post(`${apiUrl}/tickets/internal/notify`, { ticketId, userId, status })
      .catch((err) =>
        this.logger.warn(`WS notify failed: ${err.message}`),
      );
  }
}
