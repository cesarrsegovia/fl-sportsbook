/**
 * @module CashoutService
 * @description Servicio de retiro anticipado (cashout) de apuestas.
 * Permite a los usuarios cobrar una apuesta antes de que finalice el evento,
 * recibiendo un monto calculado según la variación de cuotas.
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * DTO de respuesta para una cotización de cashout.
 *
 * @interface CashoutQuoteDto
 */
export interface CashoutQuoteDto {
  /** ID del ticket para el cual se cotiza el cashout */
  ticketId: string;
  /** Monto que recibiría el usuario al realizar el cashout */
  cashoutAmount: number;
  /** Cuotas actuales de la selección */
  currentOdds: number;
  /** Cuotas al momento de realizar la apuesta */
  oddsAtBet: number;
  /** Fecha de expiración de la cotización de cashout (ISO 8601) */
  expiresAt: string;
}

/**
 * Servicio que gestiona la funcionalidad de cashout (retiro anticipado).
 *
 * Reglas de negocio:
 * - Solo disponible para tickets CONFIRMED con apuestas simples (no parlays en v1).
 * - El monto se calcula como: `stake × (oddsAtQuote / currentOdds) × (1 - margen)`.
 * - Límite máximo: 90% del stake original (safety cap).
 * - Verificación de drift: rechaza si la variación supera 2% respecto al monto esperado.
 * - TTL de cotización: 10 segundos.
 *
 * @example
 * ```typescript
 * // Obtener cotización de cashout
 * const quote = await cashoutService.getCashoutQuote('ticket-id', 'user-id');
 *
 * // Ejecutar cashout
 * await cashoutService.executeCashout('ticket-id', 'user-id', quote.cashoutAmount);
 * ```
 */
@Injectable()
export class CashoutService {
  private readonly logger = new Logger(CashoutService.name);
  /** Tiempo de vida de las cotizaciones de cashout en segundos */
  private readonly CASHOUT_TTL_SECONDS = 10;
  /** Margen de la casa aplicado al cálculo de cashout (default: 5%) */
  private readonly CASHOUT_MARGIN = parseFloat(
    process.env.CASHOUT_MARGIN || '0.05',
  );

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera una cotización de cashout para un ticket dado.
   *
   * @param ticketId - ID del ticket a cotizar
   * @param userId - ID del usuario propietario (para validación de ownership)
   * @returns Cotización con el monto de cashout y fecha de expiración
   * @throws {NotFoundException} Si el ticket no existe
   * @throws {ForbiddenException} Si el usuario no es propietario del ticket
   * @throws {BadRequestException} Si el ticket no es elegible para cashout
   */
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

    // Limitar al 90% del stake máximo (safety cap) y floor en 0
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

  /**
   * Ejecuta el cashout de un ticket.
   *
   * Proceso:
   * 1. Valida elegibilidad del ticket y ownership del usuario.
   * 2. Recalcula el monto actual y verifica drift (>2% → rechaza).
   * 3. Crea un registro de calificación con outcome REFUND.
   * 4. Crea un trabajo de liquidación para el pago.
   * 5. Actualiza el ticket a estado CASHED_OUT.
   *
   * @param ticketId - ID del ticket a cobrar
   * @param userId - ID del usuario propietario
   * @param expectedAmount - Monto esperado por el usuario (para verificación de drift)
   * @returns Ticket actualizado con estado CASHED_OUT
   * @throws {BadRequestException} Con código `CASHOUT_AMOUNT_CHANGED` si el monto varió >2%
   */
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

    // Verificación de drift (>2% → rechazo)
    if (expectedAmount > 0) {
      const drift = Math.abs(actualAmount - expectedAmount) / expectedAmount;
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

  /**
   * Carga y valida un ticket para operaciones de cashout.
   *
   * Validaciones realizadas:
   * - El ticket existe.
   * - El usuario es propietario.
   * - El estado es CONFIRMED.
   * - No es un parlay (no soportado en v1).
   * - Tiene selección asociada.
   * - El evento no ha comenzado (lockTime no pasó).
   *
   * @param ticketId - ID del ticket a cargar
   * @param userId - ID del usuario para validar ownership
   * @returns Ticket con quote, selection, market y event incluidos
   * @throws {NotFoundException} Si el ticket no existe
   * @throws {ForbiddenException} Si el usuario no es propietario
   * @throws {BadRequestException} Si el ticket no es elegible
   */
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
      throw new BadRequestException('Cashout not available for parlays in v1');
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

  /**
   * Obtiene las cuotas actuales de una selección.
   *
   * @param selectionId - ID de la selección a consultar
   * @returns Valor actual de las cuotas, o null si no están disponibles
   */
  private async getCurrentOdds(selectionId: string): Promise<number | null> {
    const selection = await this.prisma.selection.findUnique({
      where: { id: selectionId },
    });
    return selection?.oddsValue ?? null;
  }
}
