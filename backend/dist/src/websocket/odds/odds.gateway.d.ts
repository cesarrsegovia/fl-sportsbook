import { Server } from 'socket.io';
import { Match, Odds } from '@sportsbook/types';
export declare class OddsGateway {
    server: Server;
    broadcastMatchUpdate(data: Match): void;
    broadcastOddsUpdate(data: Odds): void;
}
