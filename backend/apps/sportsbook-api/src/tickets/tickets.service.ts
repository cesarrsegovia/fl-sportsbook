import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OddsGateway } from '../websocket/odds/odds.gateway';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: OddsGateway,
  ) {}

  async findByUser(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        quote: {
          include: {
            selection: {
              include: {
                market: {
                  include: { event: { include: { match: true } } },
                },
              },
            },
          },
        },
        settlementJob: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        quote: {
          include: {
            selection: {
              include: {
                market: {
                  include: { event: { include: { match: true } } },
                },
              },
            },
          },
        },
        gradingRecord: true,
        settlementJob: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async notifyTicketUpdate(ticketId: string, userId: string, status: string) {
    this.wsGateway.broadcastTicketUpdate({ ticketId, userId, status });
    return { ok: true };
  }
}
