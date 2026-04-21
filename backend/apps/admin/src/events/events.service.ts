/**
 * @module AdminEventsService
 * @description Servicio de gestión administrativa de eventos y mercados del sportsbook.
 *
 * Permite a los operadores:
 * - Listar eventos con filtros por estado y liga.
 * - Suspender/reactivar eventos completos (incluidos sus mercados).
 * - Suspender/reactivar mercados individuales.
 * - Ajustar manualmente las cuotas de selecciones dentro de un mercado.
 *
 * Todas las acciones requieren un motivo mínimo de 10 caracteres y se registran
 * en el log de auditoría con el estado anterior y posterior de la entidad.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@sportsbook/prisma';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class AdminEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: {
    status?: string;
    league?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.league) where.match = { league: query.league };

    const [data, total] = await Promise.all([
      this.prisma.sportsbookEvent.findMany({
        where,
        include: {
          match: true,
          markets: { include: { selections: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sportsbookEvent.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async suspendEvent(eventId: string, reason: string, actor: string) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }

    const before = await this.prisma.sportsbookEvent.findUnique({
      where: { id: eventId },
    });
    if (!before) throw new NotFoundException('Event not found');

    const after = await this.prisma.sportsbookEvent.update({
      where: { id: eventId },
      data: { status: 'SUSPENDED' },
    });

    await this.prisma.market.updateMany({
      where: { eventId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    });

    await this.auditService.log({
      entity: 'SportsbookEvent',
      entityId: eventId,
      action: 'SUSPEND',
      actor,
      before,
      after,
      reason,
    });

    return after;
  }

  async reactivateEvent(eventId: string, reason: string, actor: string) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }

    const event = await this.prisma.sportsbookEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (event.lockTime <= new Date()) {
      throw new BadRequestException(
        'Cannot reactivate: lockTime has already passed',
      );
    }

    const before = { ...event };
    const after = await this.prisma.sportsbookEvent.update({
      where: { id: eventId },
      data: { status: 'ACTIVE' },
    });

    await this.auditService.log({
      entity: 'SportsbookEvent',
      entityId: eventId,
      action: 'REACTIVATE',
      actor,
      before,
      after,
      reason,
    });

    return after;
  }

  async suspendMarket(marketId: string, reason: string, actor: string) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }

    const before = await this.prisma.market.findUnique({
      where: { id: marketId },
    });
    if (!before) throw new NotFoundException('Market not found');

    const after = await this.prisma.market.update({
      where: { id: marketId },
      data: { status: 'SUSPENDED' },
    });

    await this.auditService.log({
      entity: 'Market',
      entityId: marketId,
      action: 'SUSPEND',
      actor,
      before,
      after,
      reason,
    });

    return after;
  }

  async setMarketOdds(
    marketId: string,
    legs: Array<{ selectionId: string; oddsValue: number }>,
    reason: string,
    actor: string,
  ) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }
    if (!legs || legs.length === 0) {
      throw new BadRequestException('legs is required');
    }
    for (const leg of legs) {
      if (leg.oddsValue == null || leg.oddsValue <= 1) {
        throw new BadRequestException(
          `Invalid oddsValue for selection ${leg.selectionId}`,
        );
      }
    }

    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { selections: true },
    });
    if (!market) throw new NotFoundException('Market not found');

    const before = {
      status: market.status,
      selections: market.selections.map((s) => ({
        id: s.id,
        name: s.name,
        oddsValue: s.oddsValue,
      })),
    };

    for (const leg of legs) {
      const exists = market.selections.find((s) => s.id === leg.selectionId);
      if (!exists) {
        throw new BadRequestException(
          `Selection ${leg.selectionId} not in market ${marketId}`,
        );
      }
      await this.prisma.selection.update({
        where: { id: leg.selectionId },
        data: { oddsValue: leg.oddsValue },
      });
    }

    // Recheck: if all selections now have odds, reactivate the market
    const refreshed = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { selections: true },
    });
    const allHaveOdds = refreshed!.selections.every(
      (s) => s.oddsValue != null && s.oddsValue > 1,
    );
    const newStatus =
      allHaveOdds && market.status === 'SUSPENDED' ? 'ACTIVE' : market.status;

    const after = await this.prisma.market.update({
      where: { id: marketId },
      data: { status: newStatus },
      include: { selections: true },
    });

    await this.auditService.log({
      entity: 'Market',
      entityId: marketId,
      action: 'SET_ODDS',
      actor,
      before,
      after: {
        status: after.status,
        selections: after.selections.map((s) => ({
          id: s.id,
          name: s.name,
          oddsValue: s.oddsValue,
        })),
      },
      reason,
    });

    return after;
  }

  async reactivateMarket(marketId: string, reason: string, actor: string) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }

    const before = await this.prisma.market.findUnique({
      where: { id: marketId },
    });
    if (!before) throw new NotFoundException('Market not found');

    const after = await this.prisma.market.update({
      where: { id: marketId },
      data: { status: 'ACTIVE' },
    });

    await this.auditService.log({
      entity: 'Market',
      entityId: marketId,
      action: 'REACTIVATE',
      actor,
      before,
      after,
      reason,
    });

    return after;
  }
}
