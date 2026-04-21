/**
 * @module AuditService
 * @description Servicio centralizado de registro de auditoría.
 *
 * Registra todas las acciones administrativas con el estado anterior y posterior
 * de la entidad afectada, el actor que realizó la acción y el motivo.
 * Proporciona un wrapper `withAudit()` para simplificar el logging en operaciones transaccionales.
 *
 * @example
 * ```typescript
 * await auditService.log({
 *   entity: 'Ticket', entityId: 'ticket-123',
 *   action: 'VOID', actor: 'admin',
 *   before: oldTicket, after: newTicket,
 *   reason: 'Error en cuotas reportado por usuario',
 * });
 * ```
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sportsbook/prisma';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    entity: string;
    entityId: string;
    action: string;
    actor: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        actor: params.actor,
        before: params.before ? (params.before as any) : undefined,
        after: params.after ? (params.after as any) : undefined,
      },
    });
  }

  async withAudit<T>(
    auditParams: {
      entity: string;
      entityId: string;
      action: string;
      actor: string;
      before?: unknown;
      after?: unknown;
      reason?: string;
    },
    action: () => Promise<T>,
  ): Promise<T> {
    const result = await action();
    await this.log(auditParams);
    return result;
  }
}
