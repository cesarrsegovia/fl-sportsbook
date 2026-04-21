/**
 * @module AdminSettlementsService
 * @description Servicio de gestión administrativa de trabajos de liquidación.
 *
 * Permite a los operadores:
 * - Listar SettlementJobs con filtro por estado y paginación.
 * - Reintentar manualmente trabajos fallidos o en intervención manual.
 * - Consultar estadísticas del pipeline de liquidación (pendientes, fallidos, pagados hoy).
 *
 * El reintento manual resetea los intentos a 0, cambia el estado a PENDING
 * y registra la acción en el log de auditoría.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@sportsbook/prisma';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class AdminSettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { status?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: any = {};

    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.settlementJob.findMany({
        where,
        include: {
          ticket: true,
          gradingRecord: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.settlementJob.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async retrySettlement(
    settlementJobId: string,
    reason: string,
    actor: string,
  ) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }

    const job = await this.prisma.settlementJob.findUnique({
      where: { id: settlementJobId },
    });
    if (!job) throw new NotFoundException('Settlement job not found');

    if (!['FAILED', 'MANUAL_INTERVENTION'].includes(job.status)) {
      throw new BadRequestException(
        `Job is in status ${job.status}, cannot retry`,
      );
    }

    const before = { ...job };
    const after = await this.prisma.settlementJob.update({
      where: { id: settlementJobId },
      data: {
        status: 'PENDING',
        attempts: 0,
        notes: `Manual retry by ${actor}: ${reason}`,
      },
    });

    await this.prisma.ticket.update({
      where: { id: job.ticketId },
      data: { status: 'SETTLING' },
    });

    await this.auditService.log({
      entity: 'SettlementJob',
      entityId: settlementJobId,
      action: 'MANUAL_RETRY',
      actor,
      before,
      after,
      reason,
    });

    return after;
  }

  async getStats() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const [
      pending,
      failed,
      manualIntervention,
      confirmedToday,
      totalPaidToday,
    ] = await Promise.all([
      this.prisma.settlementJob.count({ where: { status: 'PENDING' } }),
      this.prisma.settlementJob.count({ where: { status: 'FAILED' } }),
      this.prisma.settlementJob.count({
        where: { status: 'MANUAL_INTERVENTION' },
      }),
      this.prisma.settlementJob.count({
        where: { status: 'CONFIRMED', settledAt: { gte: todayStart } },
      }),
      this.prisma.settlementJob.aggregate({
        where: { status: 'CONFIRMED', settledAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      failed,
      manualIntervention,
      confirmedToday,
      totalPaidTodayUsd: totalPaidToday._sum.amount || 0,
    };
  }
}
