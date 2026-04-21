import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Servicio de consulta de eventos de apuestas.
 *
 * Proporciona acceso de solo lectura a los eventos del sportsbook con
 * sus mercados, selecciones y datos del partido asociado. Soporta filtrado
 * por deporte, liga y estado del evento.
 */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { sport?: string; league?: string; status?: string }) {
    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.league || filters.sport) {
      where.match = {};
      if (filters.league) where.match.league = filters.league.toUpperCase();
      if (filters.sport) where.match.sport = filters.sport.toLowerCase();
    }

    const events = await this.prisma.sportsbookEvent.findMany({
      where,
      include: {
        match: true,
        markets: {
          include: {
            selections: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return events.map(this.formatEvent);
  }

  async findOne(eventId: string) {
    const event = await this.prisma.sportsbookEvent.findUnique({
      where: { id: eventId },
      include: {
        match: {
          include: { odds: { orderBy: { lastUpdateAt: 'desc' }, take: 1 } },
        },
        markets: {
          include: { selections: true },
        },
      },
    });
    if (!event) return null;
    return this.formatEvent(event);
  }

  private formatEvent(event: any) {
    return {
      id: event.id,
      matchId: event.matchId,
      status: event.status,
      lockTime: event.lockTime,
      match: {
        homeTeam: event.match.homeTeam,
        awayTeam: event.match.awayTeam,
        homeLogo: event.match.homeLogo,
        awayLogo: event.match.awayLogo,
        startTime: event.match.startTime,
        league: event.match.league,
        sport: event.match.sport,
      },
      markets: event.markets.map((m: any) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        selections: m.selections.map((s: any) => ({
          id: s.id,
          name: s.name,
          oddsValue: s.oddsValue,
        })),
      })),
    };
  }
}
