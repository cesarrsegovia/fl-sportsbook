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
