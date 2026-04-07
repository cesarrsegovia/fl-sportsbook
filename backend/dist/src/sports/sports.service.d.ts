import { OnModuleInit } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { OddsGateway } from '../websocket/odds/odds.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { Match, TeamRanking } from '@sportsbook/types';
export declare class SportsService implements OnModuleInit {
    private prisma;
    private wsGateway;
    private cacheManager;
    private readonly logger;
    constructor(prisma: PrismaService, wsGateway: OddsGateway, cacheManager: Cache);
    onModuleInit(): Promise<void>;
    findAll(league: string): Promise<Match[]>;
    getStandings(league: string): Promise<TeamRanking[]>;
    handleNbaSync(): Promise<void>;
    handleSoccerSync(): Promise<void>;
    handleLibertadoresSync(): Promise<void>;
    handleNhlSync(): Promise<void>;
    private syncLeague;
    handleNbaStandingsSync(): Promise<void>;
    handleSoccerStandingsSync(): Promise<void>;
    handleLibertadoresStandingsSync(): Promise<void>;
    handleNhlStandingsSync(): Promise<void>;
    private syncStandings;
}
