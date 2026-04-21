/**
 * @module EventCatalogService
 * @description Servicio responsable de sincronizar y mantener el catálogo de eventos
 * del sportsbook. Convierte datos de partidos deportivos en eventos apostables con
 * mercados y selecciones, y gestiona la frescura del feed de datos.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Servicio de catálogo de eventos del sportsbook.
 *
 * Responsabilidades principales:
 * - Sincronizar partidos deportivos con eventos de apuestas.
 * - Crear/actualizar mercados (MATCH_WINNER, BOTH_TEAMS_TO_SCORE, etc.) y selecciones.
 * - Suspender automáticamente eventos que superaron su lockTime.
 * - Detectar feeds obsoletos y suspender eventos afectados.
 *
 * @example
 * ```typescript
 * // Sincronizar un partido con el catálogo
 * await eventCatalogService.syncEventFromMatch('match-uuid-123');
 * ```
 */
@Injectable()
export class EventCatalogService {
  private readonly logger = new Logger(EventCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sincroniza un partido deportivo con su evento correspondiente en el sportsbook.
   *
   * Realiza las siguientes operaciones:
   * 1. Busca el partido por ID e incluye las cuotas más recientes.
   * 2. Calcula el `lockTime` (cierre de apuestas) basado en `EVENT_LOCK_WINDOW_MINUTES`.
   * 3. Determina el estado del evento (ACTIVE, SUSPENDED, FINISHED).
   * 4. Crea o actualiza el evento, mercado MATCH_WINNER y sus selecciones.
   * 5. Para fútbol: crea mercados adicionales (BTTS, Medio Tiempo, Doble Chance).
   *
   * @param matchId - ID del partido a sincronizar
   * @throws Error si la operación de base de datos falla (capturado internamente)
   */
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

      const marketStatus = eventStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED';

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

      // Mercados adicionales (Fase 4) — solo fútbol, cuotas null → mercado SUSPENDED
      if (match.sport === 'soccer') {
        await this.upsertMarketWithSelections(
          sbEvent.id,
          'BOTH_TEAMS_TO_SCORE',
          [
            { name: 'yes', oddsValue: null },
            { name: 'no', oddsValue: null },
          ],
        );
        await this.upsertMarketWithSelections(sbEvent.id, 'HALF_TIME_RESULT', [
          { name: 'home', oddsValue: null },
          { name: 'draw', oddsValue: null },
          { name: 'away', oddsValue: null },
        ]);
        await this.upsertMarketWithSelections(sbEvent.id, 'DOUBLE_CHANCE', [
          { name: '1X', oddsValue: null },
          { name: 'X2', oddsValue: null },
          { name: '12', oddsValue: null },
        ]);
      }
    } catch (err) {
      this.logger.error(`syncEventFromMatch(${matchId}) failed:`, err.message);
    }
  }

  /**
   * Crea o actualiza un mercado con sus selecciones asociadas.
   *
   * No sobreescribe cuotas existentes establecidas por el administrador;
   * solo crea selecciones faltantes. El mercado se activa automáticamente
   * si todas sus selecciones tienen cuotas válidas.
   *
   * @param eventId - ID del evento al que pertenece el mercado
   * @param type - Tipo de mercado a crear/actualizar
   * @param defs - Definiciones de selecciones con nombre y valor de cuota
   */
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
    // Estado del mercado: ACTIVE solo si todas las selecciones ya tienen cuotas; sino SUSPENDED
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
      // No sobreescribir cuotas existentes establecidas por el admin; solo crear selecciones faltantes
    }
  }

  /**
   * Tarea cron que suspende eventos cuyo lockTime ya pasó.
   *
   * Se ejecuta cada 30 segundos. Busca eventos ACTIVE con lockTime anterior
   * al momento actual y los marca como SUSPENDED junto con sus mercados activos.
   *
   * @cron `* /30 * * * * *` (cada 30 segundos)
   */
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

  /**
   * Tarea cron que verifica la frescura del feed de datos externos.
   *
   * Se ejecuta cada 5 minutos. Busca eventos ACTIVE cuyo `feedFreshAt`
   * sea anterior a 3 minutos atrás y los suspende individualmente con log de advertencia.
   *
   * @cron `0 * /5 * * * *` (cada 5 minutos)
   */
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
