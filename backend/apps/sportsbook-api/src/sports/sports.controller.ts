import { Controller, Get, Param } from '@nestjs/common';
import { SportsService } from './sports.service';

/**
 * Controlador de datos deportivos.
 *
 * Expone endpoints para consultar partidos y clasificaciones por liga:
 * - `GET /sports/:league` — Lista de partidos de una liga.
 * - `GET /sports/:league/standings` — Clasificación/tabla de posiciones de una liga.
 */
@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get(':league')
  findAll(@Param('league') league: string) {
    return this.sportsService.findAll(league);
  }

  @Get(':league/standings')
  getStandings(@Param('league') league: string) {
    return this.sportsService.getStandings(league);
  }
}
