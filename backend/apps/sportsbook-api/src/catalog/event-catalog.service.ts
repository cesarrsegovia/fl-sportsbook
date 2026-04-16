import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventCatalogService {
  private readonly logger = new Logger(EventCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncEventFromMatch(matchId: string): Promise<void> {
    try {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        include: { odds: { orderBy: { lastUpdateAt: 'desc' }, take: 1 } },
      });
      if (!match) return;

      const lockWindowMinutes = parseInt(
        process.env.EVENT_LOCK_WINDOW_MINUTES || '5',
      );
      const lockTime = new Date(
        match.startTime.getTime() - lockWindowMinutes * 60 * 1000,
      );
      const now = new Date();

      let eventStatus: 'ACTIVE' | 'SUSPENDED' | 'FINISHED';
      if (match.status === 'FINISHED') {
        eventStatus = 'FINISHED';
      } else if (match.status === 'LIVE') {
        eventStatus = 'SUSPENDED';
      } else {
        eventStatus = now < lockTime ? 'ACTIVE' : 'SUSPENDED';
      }

      const sbEvent = await this.prisma.sportsbookEvent.upsert({
        where: { matchId },
        update: { status: eventStatus, lockTime, feedFreshAt: now },
        create: { matchId, status: eventStatus, lockTime, feedFreshAt: now },
      });

      const marketStatus =
        eventStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED';

      let market = await this.prisma.market.findFirst({
        where: { eventId: sbEvent.id, type: 'MATCH_WINNER' },
      });
      if (!market) {
        market = await this.prisma.market.create({
          data: {
            eventId: sbEvent.id,
            type: 'MATCH_WINNER',
            status: marketStatus,
          },
        });
      } else if (market.status !== marketStatus) {
        market = await this.prisma.market.update({
          where: { id: market.id },
          data: { status: marketStatus },
        });
      }

      const odds = match.odds?.[0];
      if (odds) {
        const selectionDefs = [
          { name: 'home', oddsValue: odds.homeWin },
          { name: 'draw', oddsValue: odds.draw },
          { name: 'away', oddsValue: odds.awayWin },
        ];

        for (const { name, oddsValue } of selectionDefs) {
          if (oddsValue == null) continue;
          const existing = await this.prisma.selection.findFirst({
            where: { marketId: market.id, name },
          });
          if (existing) {
            await this.prisma.selection.update({
              where: { id: existing.id },
              data: { oddsValue },
            });
          } else {
            await this.prisma.selection.create({
              data: { marketId: market.id, name, oddsValue },
            });
          }
        }
      }

      // Additional markets (Fase 4) — soccer only, odds null → market SUSPENDED
      if (match.sport === 'soccer') {
        await this.upsertMarketWithSelections(
          sbEvent.id,
          'BOTH_TEAMS_TO_SCORE',
          [
            { name: 'yes', oddsValue: null },
            { name: 'no', oddsValue: null },
          ],
        );
        await this.upsertMarketWithSelections(
          sbEvent.id,
          'HALF_TIME_RESULT',
          [
            { name: 'home', oddsValue: null },
            { name: 'draw', oddsValue: null },
            { name: 'away', oddsValue: null },
          ],
        );
        await this.upsertMarketWithSelections(
          sbEvent.id,
          'DOUBLE_CHANCE',
          [
            { name: '1X', oddsValue: null },
            { name: 'X2', oddsValue: null },
            { name: '12', oddsValue: null },
          ],
        );
      }
    } catch (err) {
      this.logger.error(`syncEventFromMatch(${matchId}) failed:`, err.message);
    }
  }

  private async upsertMarketWithSelections(
    eventId: string,
    type:
      | 'BOTH_TEAMS_TO_SCORE'
      | 'HALF_TIME_RESULT'
      | 'DOUBLE_CHANCE'
      | 'ASIAN_HANDICAP',
    defs: Array<{ name: string; oddsValue: number | null }>,
  ): Promise<void> {
    let market = await this.prisma.market.findFirst({
      where: { eventId, type },
    });
    // Market status: ACTIVE only if all selections already have odds; otherwise SUSPENDED
    const allHaveOdds = defs.every((d) => d.oddsValue != null);

    if (!market) {
      market = await this.prisma.market.create({
        data: {
          eventId,
          type,
          status: allHaveOdds ? 'ACTIVE' : 'SUSPENDED',
        },
      });
    }

    for (const { name, oddsValue } of defs) {
      const existing = await this.prisma.selection.findFirst({
        where: { marketId: market.id, name },
      });
      if (!existing) {
        await this.prisma.selection.create({
          data: { marketId: market.id, name, oddsValue: oddsValue ?? null },
        });
      }
      // Do NOT overwrite existing odds set by admin; only create missing selections
    }
  }

  @Cron('*/30 * * * * *')
  async suspendStaleEvents(): Promise<void> {
    try {
      const now = new Date();
      const stale = await this.prisma.sportsbookEvent.findMany({
        where: { status: 'ACTIVE', lockTime: { lte: now } },
        select: { id: true },
      });

      if (stale.length === 0) return;

      const ids = stale.map((e) => e.id);
      await this.prisma.sportsbookEvent.updateMany({
        where: { id: { in: ids } },
        data: { status: 'SUSPENDED' },
      });
      await this.prisma.market.updateMany({
        where: { eventId: { in: ids }, status: 'ACTIVE' },
        data: { status: 'SUSPENDED' },
      });
      this.logger.log(`suspendStaleEvents: suspended ${stale.length} events`);
    } catch (err) {
      this.logger.error('suspendStaleEvents failed:', err.message);
    }
  }

  @Cron('0 */5 * * * *')
  async checkFeedFreshness(): Promise<void> {
    try {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const stale = await this.prisma.sportsbookEvent.findMany({
        where: { status: 'ACTIVE', feedFreshAt: { lt: threeMinutesAgo } },
        select: { id: true },
      });

      for (const event of stale) {
        this.logger.warn(`Event ${event.id} has stale feed — suspending`);
        await this.prisma.sportsbookEvent.update({
          where: { id: event.id },
          data: { status: 'SUSPENDED' },
        });
      }
      this.logger.log(
        `checkFeedFreshness: ${stale.length} stale events suspended`,
      );
    } catch (err) {
      this.logger.error('checkFeedFreshness failed:', err.message);
    }
  }
}
