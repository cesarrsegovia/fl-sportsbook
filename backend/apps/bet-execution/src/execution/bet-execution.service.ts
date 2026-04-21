/**
 * @module BetExecutionService
 * @description Servicio responsable de ejecutar apuestas. Recibe la confirmación
 * del usuario con el hash de transacción, crea el ticket y encola la verificación
 * de confirmación on-chain. También gestiona la redención de promociones.
 */
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

/**
 * DTO para enviar una apuesta al sistema de ejecución.
 */
export class SubmitBetDto {
  /** ID de la cotización previamente obtenida */
  quoteId: string;
  /** Hash de la transacción blockchain ejecutada por el usuario */
  txHash: string;
  /** ID del usuario que realiza la apuesta */
  userId: string;
}

/**
 * Servicio de ejecución de apuestas.
 *
 * Flujo de ejecución:
 * 1. Valida que la cotización exista, no haya expirado y pertenezca al usuario.
 * 2. Previene duplicados (una cotización = un ticket máximo).
 * 3. Crea el ticket en estado SUBMITTED con las piernas del parlay si aplica.
 * 4. Redime la promoción asociada (si existe).
 * 5. Marca la cotización como ACCEPTED.
 * 6. Encola un job de confirmación on-chain con delay de 3 segundos.
 * 7. Notifica vía WebSocket al frontend sobre el nuevo ticket.
 *
 * @example
 * ```typescript
 * const ticket = await betExecutionService.submitBet({
 *   quoteId: 'quote-uuid',
 *   txHash: '0xabc...',
 *   userId: 'user-1',
 * });
 * ```
 */
@Injectable()
export class BetExecutionService {
  private readonly logger = new Logger(BetExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('confirmation') private readonly confirmationQueue: Queue,
  ) {}

  /**
   * Procesa la confirmación de una apuesta.
   *
   * @param dto - Datos de la apuesta a ejecutar
   * @returns Ticket creado en estado SUBMITTED
   * @throws {NotFoundException} Si la cotización no existe
   * @throws {ForbiddenException} Si el usuario no es propietario de la cotización
   * @throws {BadRequestException} Si la cotización ha expirado
   * @throws {ConflictException} Si la cotización ya tiene un ticket asociado
   */
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

  /**
   * Obtiene un ticket por su ID.
   *
   * @param ticketId - ID del ticket a buscar
   * @returns Ticket encontrado o null
   */
  async getTicket(ticketId: string) {
    return this.prisma.ticket.findUnique({ where: { id: ticketId } });
  }

  /**
   * Envía una notificación al Sportsbook API para broadcast vía WebSocket.
   * Es una operación fire-and-forget (no bloquea si falla).
   *
   * @param ticketId - ID del ticket actualizado
   * @param userId - ID del usuario propietario
   * @param status - Nuevo estado del ticket
   */
  private notifySportsbookApi(
    ticketId: string,
    userId: string,
    status: string,
  ) {
    const apiUrl = process.env.SPORTSBOOK_API_URL || 'http://127.0.0.1:3000';
    axios
      .post(`${apiUrl}/tickets/internal/notify`, { ticketId, userId, status })
      .catch((err) => this.logger.warn(`WS notify failed: ${err.message}`));
  }
}
