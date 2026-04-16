import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OddsGateway } from '../websocket/odds/odds.gateway';
import { LocalhostGuard } from './localhost.guard';

@Controller('internal')
export class InternalController {
  constructor(private readonly oddsGateway: OddsGateway) {}

  @Post('broadcast-ticket')
  @UseGuards(LocalhostGuard)
  broadcastTicket(
    @Body() body: { ticketId: string; userId: string; status: string },
  ) {
    this.oddsGateway.broadcastTicketUpdate(body);
    return { ok: true };
  }
}
