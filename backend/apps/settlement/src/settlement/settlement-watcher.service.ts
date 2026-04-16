import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@sportsbook/prisma';

@Injectable()
export class SettlementWatcherService {
  private readonly logger = new Logger(SettlementWatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('settlement') private readonly settlementQueue: Queue,
  ) {}

  @Cron('*/15 * * * * *')
  async enqueuePendingSettlements(): Promise<void> {
    const MAX_ATTEMPTS = parseInt(
      process.env.MAX_SETTLEMENT_ATTEMPTS || '5',
    );

    const pendingJobs = await this.prisma.settlementJob.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: MAX_ATTEMPTS },
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    for (const job of pendingJobs) {
      await this.settlementQueue.add(
        'execute-settlement',
        { settlementJobId: job.id },
        {
          jobId: `settle-${job.id}`,
          removeOnComplete: true,
        },
      );
    }

    if (pendingJobs.length > 0) {
      this.logger.log(`Enqueued ${pendingJobs.length} settlement jobs`);
    }
  }
}
