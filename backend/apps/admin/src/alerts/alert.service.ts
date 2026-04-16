import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@sportsbook/prisma';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */2 * * * *')
  async evaluateAlerts(): Promise<void> {
    await this.checkFeedStaleness();
    await this.checkManualReviewBacklog();
    await this.checkSettlementBacklog();
  }

  private async checkFeedStaleness(): Promise<void> {
    const thresholdSeconds = parseInt(
      process.env.FEED_STALE_THRESHOLD_SECONDS || '180',
    );
    const staleThreshold = new Date(Date.now() - thresholdSeconds * 1000);

    const staleEvents = await this.prisma.sportsbookEvent.findMany({
      where: {
        status: 'ACTIVE',
        feedFreshAt: { lt: staleThreshold },
      },
      include: { match: { select: { league: true } } },
    });

    if (staleEvents.length > 0) {
      const leagues = [
        ...new Set(staleEvents.map((e) => e.match.league)),
      ];
      this.logger.warn(
        `ALERT: Stale feed detected for leagues: ${leagues.join(', ')}`,
      );
    }
  }

  private async checkManualReviewBacklog(): Promise<void> {
    const count = await this.prisma.ticket.count({
      where: { status: 'MANUAL_REVIEW' },
    });
    if (count > 0) {
      this.logger.warn(`ALERT: ${count} tickets pending manual review`);
    }
  }

  private async checkSettlementBacklog(): Promise<void> {
    const count = await this.prisma.settlementJob.count({
      where: { status: 'MANUAL_INTERVENTION' },
    });
    if (count > 0) {
      this.logger.warn(
        `ALERT: ${count} settlement jobs in MANUAL_INTERVENTION`,
      );
    }
  }
}
