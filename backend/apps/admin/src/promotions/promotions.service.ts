/**
 * @module AdminPromotionsService
 * @description Servicio de gestión administrativa de promociones del sportsbook.
 *
 * Funcionalidades:
 * - **Listar** promociones con filtro opcional por estado.
 * - **Crear** nuevas promociones de tipo FREE_BET u ODDS_BOOST con validación completa.
 * - **Pausar** promociones activas (impide nuevas redenciones).
 * - **Activar** promociones pausadas (solo si no están expiradas).
 * - **Consultar redenciones** históricas de una promoción específica.
 *
 * Todas las acciones de creación/modificación se registran en el log de auditoría.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@sportsbook/prisma';
import { AuditService } from '../audit/audit.service.js';

export interface CreatePromotionDto {
  type: 'FREE_BET' | 'ODDS_BOOST';
  code?: string;
  name: string;
  description: string;
  startsAt: string;
  expiresAt: string;
  maxUses?: number | null;
  freeBetAmount?: number;
  selectionId?: string;
  boostedOdds?: number;
  originalOdds?: number;
}

@Injectable()
export class AdminPromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRedemptions(promotionId: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return this.prisma.promotionRedemption.findMany({
      where: { promotionId },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  async create(dto: CreatePromotionDto, actor: string) {
    if (!dto.name || !dto.description) {
      throw new BadRequestException('name and description required');
    }
    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);
    if (isNaN(startsAt.getTime()) || isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (expiresAt <= startsAt) {
      throw new BadRequestException('expiresAt must be after startsAt');
    }

    if (dto.type === 'FREE_BET') {
      if (!dto.freeBetAmount || dto.freeBetAmount <= 0) {
        throw new BadRequestException(
          'freeBetAmount > 0 required for FREE_BET',
        );
      }
    }
    if (dto.type === 'ODDS_BOOST') {
      if (!dto.selectionId) {
        throw new BadRequestException('selectionId required for ODDS_BOOST');
      }
      if (!dto.boostedOdds || dto.boostedOdds <= 1) {
        throw new BadRequestException('boostedOdds > 1 required');
      }
    }

    const created = await this.prisma.promotion.create({
      data: {
        type: dto.type,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        startsAt,
        expiresAt,
        maxUses: dto.maxUses ?? null,
        freeBetAmount: dto.freeBetAmount,
        selectionId: dto.selectionId,
        boostedOdds: dto.boostedOdds,
        originalOdds: dto.originalOdds,
        status: 'ACTIVE',
      },
    });

    await this.auditService.log({
      entity: 'Promotion',
      entityId: created.id,
      action: 'CREATE',
      actor,
      before: null,
      after: created,
      reason: 'Created via admin',
    });

    return created;
  }

  async pause(id: string, reason: string, actor: string) {
    const before = await this.prisma.promotion.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Promotion not found');
    const after = await this.prisma.promotion.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
    await this.auditService.log({
      entity: 'Promotion',
      entityId: id,
      action: 'PAUSE',
      actor,
      before,
      after,
      reason: reason || 'Paused',
    });
    return after;
  }

  async activate(id: string, reason: string, actor: string) {
    const before = await this.prisma.promotion.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Promotion not found');
    if (new Date() > before.expiresAt) {
      throw new BadRequestException('Cannot activate — already expired');
    }
    const after = await this.prisma.promotion.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    await this.auditService.log({
      entity: 'Promotion',
      entityId: id,
      action: 'ACTIVATE',
      actor,
      before,
      after,
      reason: reason || 'Activated',
    });
    return after;
  }
}
