import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { TicketsService } from './tickets.service';

/**
 * Controlador de tickets de apuestas del usuario.
 *
 * Expone endpoints para gestionar el ciclo de vida de tickets:
 * - `GET /tickets?userId=` — Lista de tickets de un usuario.
 * - `GET /tickets/:ticketId` — Detalle completo de un ticket.
 * - `POST /tickets/internal/notify` — Endpoint interno para broadcast WS de actualizaciones.
 */
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findByUser(@Query('userId') userId: string) {
    return this.ticketsService.findByUser(userId);
  }

  @Get(':ticketId')
  findOne(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findOne(ticketId);
  }

  // Internal endpoint: called by bet-execution to broadcast WS update
  @Post('internal/notify')
  notifyUpdate(
    @Body() body: { ticketId: string; userId: string; status: string },
  ) {
    return this.ticketsService.notifyTicketUpdate(
      body.ticketId,
      body.userId,
      body.status,
    );
  }
}
