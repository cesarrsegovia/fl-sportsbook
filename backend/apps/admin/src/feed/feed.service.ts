/**
 * @module FeedService
 * @description Servicio de monitoreo de salud del feed de datos deportivos.
 *
 * Agrupa los eventos del sportsbook por liga y calcula métricas de frescura:
 * - **FRESH** (< 90s): El feed está funcionando correctamente.
 * - **STALE** (90s - 300s): El feed tiene retraso, posible problema.
 * - **DEAD** (> 300s): El feed no recibe actualizaciones, requiere atención.
 *
 * @example Respuesta típica:
 * ```json
 * { "feeds": [
 *   { "league": "NBA", "status": "FRESH", "ageSeconds": 45, "activeEventCount": 3 },
 *   { "league": "MLB", "status": "STALE", "ageSeconds": 120, "activeEventCount": 1 }
 * ]}
 * ```
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sportsbook/prisma';

interface FeedHealth {
  league: string;
  lastSyncAt: string | null;
  ageSeconds: number;
  status: 'FRESH' | 'STALE' | 'DEAD';
  activeEventCount: number;
  suspendedEventCount: number;
}

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeedHealth(): Promise<{ feeds: FeedHealth[] }> {
    const events = await this.prisma.sportsbookEvent.findMany({
      where: { status: { in: ['ACTIVE', 'SUSPENDED'] } },
      include: { match: { select: { league: true } } },
    });

    const byLeague = new Map<
      string,
      { active: number; suspended: number; latestFresh: Date | null }
    >();

    for (const ev of events) {
      const league = ev.match.league;
      if (!byLeague.has(league)) {
        byLeague.set(league, { active: 0, suspended: 0, latestFresh: null });
      }
      const entry = byLeague.get(league)!;
      if (ev.status === 'ACTIVE') entry.active++;
      if (ev.status === 'SUSPENDED') entry.suspended++;
      if (
        ev.feedFreshAt &&
        (!entry.latestFresh || ev.feedFreshAt > entry.latestFresh)
      ) {
        entry.latestFresh = ev.feedFreshAt;
      }
    }

    const feeds: FeedHealth[] = [];
    const now = Date.now();

    for (const [league, data] of byLeague) {
      const ageSeconds = data.latestFresh
        ? Math.round((now - data.latestFresh.getTime()) / 1000)
        : 9999;

      let status: 'FRESH' | 'STALE' | 'DEAD';
      if (ageSeconds < 90) status = 'FRESH';
      else if (ageSeconds < 300) status = 'STALE';
      else status = 'DEAD';

      feeds.push({
        league,
        lastSyncAt: data.latestFresh?.toISOString() ?? null,
        ageSeconds,
        status,
        activeEventCount: data.active,
        suspendedEventCount: data.suspended,
      });
    }

    return { feeds };
  }
}
