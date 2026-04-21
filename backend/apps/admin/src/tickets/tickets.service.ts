/**
 * @module AdminTicketsService
 * @description Servicio de gestión administrativa de tickets de apuestas.
 *
 * Permite a los operadores:
 * - Consultar todos los tickets con filtros avanzados (estado, usuario, liga, fechas).
 * - Ver el detalle completo de un ticket con toda la cadena relacional.
 * - Calificar manualmente tickets en estado MANUAL_REVIEW.
 * - Anular (void) tickets confirmados que aún no fueron calificados.
 *
 * Calificación manual:
 * - Crea un GradingRecord con fuente `MANUAL_OPERATOR`.
 * - Para outcomes WIN/REFUND, genera automáticamente un SettlementJob.
 * - Utiliza clave de idempotencia SHA-256 para evitar pagos duplicados.
 *
 * Todas las acciones se registran en el log de auditoría.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@sportsbook/prisma';
import { AuditService } from '../audit/audit.service.js';
import * as crypto from 'crypto';

type GradeOutcome = 'WIN' | 'LOSS' | 'VOID' | 'REFUND';

function outcomeToTicketStatus(outcome: GradeOutcome): string {
  switch (outcome) {
    case 'WIN':
      return 'WON';
    case 'LOSS':
      return 'LOST';
    case 'VOID':
      return 'VOID';
    case 'REFUND':
      return 'REFUNDED';
  }
}

@Injectable()
export class AdminTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: {
    status?: string;
    userId?: string;
    league?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo)
        where.createdAt.lte = new Date(query.dateTo + 'T23:59:59Z');
    }

    if (query.league) {
      where.quote = {
        selection: {
          market: {
            event: {
              match: { league: query.league },
            },
          },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          quote: {
            include: {
              selection: {
                include: {
                  market: {
                    include: {
                      event: { include: { match: true } },
                    },
                  },
                },
              },
            },
          },
          gradingRecord: true,
          settlementJob: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total, page, limit };
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
                  include: {
                    event: { include: { match: true } },
                  },
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

  async manualGrade(
    ticketId: string,
    outcome: GradeOutcome,
    reason: string,
    actor: string,
  ): Promise<void> {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { gradingRecord: true, quote: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'MANUAL_REVIEW') {
      throw new BadRequestException(
        `Ticket ${ticketId} is in status ${ticket.status}, not MANUAL_REVIEW`,
      );
    }
    if (ticket.gradingRecord) {
      throw new ConflictException('Ticket already has a grading record');
    }

    const gradingRecord = await this.prisma.gradingRecord.create({
      data: {
        ticketId,
        outcome,
        resultSource: 'MANUAL_OPERATOR',
        gradedBy: actor,
        notes: reason,
      },
    });

    const newStatus = outcomeToTicketStatus(outcome);
    const before = { ...ticket };
    const after = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus as any },
    });

    await this.auditService.log({
      entity: 'Ticket',
      entityId: ticketId,
      action: 'MANUAL_GRADE',
      actor,
      before,
      after: { ...after, gradingRecord },
      reason,
    });

    if (outcome === 'WIN' || outcome === 'REFUND') {
      const amount =
        outcome === 'WIN' ? ticket.quote.expectedPayout : ticket.quote.stake;

      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`${ticketId}:${outcome}:${amount.toFixed(6)}`)
        .digest('hex');

      await this.prisma.settlementJob.upsert({
        where: { idempotencyKey },
        create: {
          ticketId,
          gradingRecordId: gradingRecord.id,
          idempotencyKey,
          amount,
          toWallet: ticket.userId,
          status: 'PENDING',
        },
        update: {},
      });

      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'SETTLING' },
      });
    }
  }

  async voidTicket(ticketId: string, reason: string, actor: string) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { gradingRecord: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Ticket must be in CONFIRMED status to void, currently: ${ticket.status}`,
      );
    }
    if (ticket.gradingRecord) {
      throw new ConflictException('Ticket already has a grading record');
    }

    const before = { ...ticket };
    const after = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'VOID' },
    });

    await this.prisma.gradingRecord.create({
      data: {
        ticketId,
        outcome: 'VOID',
        resultSource: 'MANUAL_OPERATOR',
        gradedBy: actor,
        notes: reason,
      },
    });

    await this.auditService.log({
      entity: 'Ticket',
      entityId: ticketId,
      action: 'VOID',
      actor,
      before,
      after,
      reason,
    });

    return after;
  }
}
