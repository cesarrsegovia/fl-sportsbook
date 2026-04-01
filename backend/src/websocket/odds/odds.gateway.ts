import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Match, Odds } from '@sportsbook/types';

/**
 * Gateway responsible for real-time WebSocket communication.
 * Emits match and odds updates to connected extension clients.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OddsGateway {
  @WebSocketServer()
  server: Server;

  /**
   * Broadcasts match status and score updates to all clients.
   */
  broadcastMatchUpdate(data: Match) {
    this.server.emit('MATCH_UPDATE', data);
  }

  broadcastOddsUpdate(data: Odds) {
    this.server.emit('ODDS_UPDATE', data);
  }
}
