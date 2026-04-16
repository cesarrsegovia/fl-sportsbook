import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sportsbook/prisma';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleThreshold = new Date(now.getTime() - 3 * 60 * 1000);
    const deadThreshold = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      confirmedLast24h,
      manualReviewPending,
      settlementFailedPending,
      totalActiveToday,
      settlementPending,
      settlementManualIntervention,
      settlementConfirmedToday,
      totalPaidToday,
      activeEvents,
      suspendedEvents,
      staleEvents,
      deadEvents,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: { status: 'CONFIRMED', confirmedAt: { gte: last24h } },
      }),
      this.prisma.ticket.count({ where: { status: 'MANUAL_REVIEW' } }),
      this.prisma.ticket.count({ where: { status: 'SETTLEMENT_FAILED' } }),
      this.prisma.ticket.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.settlementJob.count({ where: { status: 'PENDING' } }),
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
      this.prisma.sportsbookEvent.count({ where: { status: 'ACTIVE' } }),
      this.prisma.sportsbookEvent.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.sportsbookEvent.findMany({
        where: {
          status: 'ACTIVE',
          feedFreshAt: { lt: staleThreshold },
        },
        include: { match: { select: { league: true } } },
      }),
      this.prisma.sportsbookEvent.findMany({
        where: {
          status: 'ACTIVE',
          feedFreshAt: { lt: deadThreshold },
        },
        include: { match: { select: { league: true } } },
      }),
    ]);

    const staleLeagues = [
      ...new Set(staleEvents.map((e) => e.match.league)),
    ];
    const deadLeagues = [...new Set(deadEvents.map((e) => e.match.league))];

    return {
      tickets: {
        confirmedLast24h,
        manualReviewPending,
        settlementFailedPending,
        totalActiveToday,
      },
      settlements: {
        pendingCount: settlementPending,
        manualInterventionCount: settlementManualIntervention,
        confirmedTodayCount: settlementConfirmedToday,
        totalPaidTodayUsd: totalPaidToday._sum.amount || 0,
      },
      feed: {
        staleLeagues,
        deadLeagues,
      },
      events: {
        activeCount: activeEvents,
        suspendedCount: suspendedEvents,
      },
    };
  }
}
