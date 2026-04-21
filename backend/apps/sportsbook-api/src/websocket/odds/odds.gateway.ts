/**
 * @module OddsGateway
 * @description Gateway WebSocket para transmisión de eventos en tiempo real.
 * Utiliza Socket.IO para enviar actualizaciones de partidos, cuotas y tickets
 * a todos los clientes conectados.
 */
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Match, Odds } from '@sportsbook/shared-types';

/**
 * Gateway WebSocket principal del sportsbook.
 *
 * Acepta conexiones desde cualquier origen (CORS: *) y emite
 * tres tipos de eventos:
 * - `MATCH_UPDATE`: Cambios en marcadores, estado o estadísticas de partidos.
 * - `ODDS_UPDATE`: Actualizaciones de cuotas de apuestas.
 * - `TICKET_UPDATE`: Cambios en el estado de tickets de usuarios.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OddsGateway {
  /** Instancia del servidor Socket.IO inyectada por NestJS */
  @WebSocketServer()
  server: Server;

  /**
   * Emite una actualización de partido a todos los clientes conectados.
   *
   * @param data - Datos actualizados del partido
   */
  broadcastMatchUpdate(data: Match) {
    this.server.emit('MATCH_UPDATE', data);
  }

  /**
   * Emite una actualización de cuotas a todos los clientes conectados.
   *
   * @param data - Datos actualizados de las cuotas
   */
  broadcastOddsUpdate(data: Odds) {
    this.server.emit('ODDS_UPDATE', data);
  }

  /**
   * Emite una actualización de estado de ticket a todos los clientes conectados.
   * El frontend filtra por `userId` para mostrar solo al usuario correspondiente.
   *
   * @param data - Datos del ticket actualizado
   * @param data.ticketId - ID del ticket actualizado
   * @param data.userId - ID del usuario propietario
   * @param data.status - Nuevo estado del ticket
   */
  broadcastTicketUpdate(data: {
    ticketId: string;
    userId: string;
    status: string;
  }) {
    this.server.emit('TICKET_UPDATE', data);
  }
}
