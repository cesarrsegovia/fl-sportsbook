import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CashoutService } from './cashout.service';

/**
 * Controlador de retiro anticipado (cashout) de apuestas.
 *
 * Endpoints montados bajo `/tickets`:
 * - `GET /tickets/:ticketId/cashout-quote` — Obtener cotización de cashout.
 * - `POST /tickets/:ticketId/cashout` — Ejecutar cashout.
 */
@Controller('tickets')
export class CashoutController {
  constructor(private readonly cashoutService: CashoutService) {}

  @Get(':ticketId/cashout-quote')
  async getCashoutQuote(
    @Param('ticketId') ticketId: string,
    @Query('userId') userId: string,
  ) {
    return this.cashoutService.getCashoutQuote(ticketId, userId);
  }

  @Post(':ticketId/cashout')
  async executeCashout(
    @Param('ticketId') ticketId: string,
    @Body() body: { userId: string; expectedAmount: number },
  ) {
    return this.cashoutService.executeCashout(
      ticketId,
      body.userId,
      body.expectedAmount,
    );
  }
}
