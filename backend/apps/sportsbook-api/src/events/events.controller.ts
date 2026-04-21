import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { EventsService } from './events.service';

/**
 * Controlador de eventos de apuestas del sportsbook.
 *
 * Expone endpoints para consultar eventos disponibles con sus mercados y selecciones:
 * - `GET /events` — Lista de eventos con filtros opcionales (sport, league, status).
 * - `GET /events/:eventId` — Detalle de un evento específico con cuotas.
 */
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(
    @Query('sport') sport?: string,
    @Query('league') league?: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.findAll({ sport, league, status });
  }

  @Get(':eventId')
  async findOne(@Param('eventId') eventId: string) {
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
