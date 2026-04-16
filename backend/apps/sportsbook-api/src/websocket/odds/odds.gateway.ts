import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Match, Odds } from '@sportsbook/shared-types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OddsGateway {
  @WebSocketServer()
  server: Server;

  broadcastMatchUpdate(data: Match) {
    this.server.emit('MATCH_UPDATE', data);
  }

  broadcastOddsUpdate(data: Odds) {
    this.server.emit('ODDS_UPDATE', data);
  }

  broadcastTicketUpdate(data: {
    ticketId: string;
    userId: string;
    status: string;
  }) {
    this.server.emit('TICKET_UPDATE', data);
  }
}
