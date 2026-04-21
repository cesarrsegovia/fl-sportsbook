import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OddsGateway } from '../websocket/odds/odds.gateway';

/**
 * Servicio de gestión de tickets de apuestas del usuario.
 *
 * Proporciona:
 * - Consulta de historial de tickets por usuario con datos completos
 *   (cotización, selección, mercado, evento, partido, liquidación).
 * - Consulta de detalle individual de un ticket con registro de calificación.
 * - Notificación de actualizaciones vía WebSocket.
 */
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
