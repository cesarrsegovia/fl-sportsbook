import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import axios from 'axios';
import { OddsGateway } from '../websocket/odds/odds.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { Match, Odds, TeamRanking } from '@sportsbook/types';

@Injectable()
export class SportsService implements OnModuleInit {
    private readonly logger = new Logger(SportsService.name);

    /**
     * Service responsible for fetching sports data from external APIs (ESPN),
     * managing persistence with Prisma, and handling real-time updates via WebSocket.
     */
    constructor(
        private prisma: PrismaService,
        private wsGateway: OddsGateway,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    async onModuleInit() {
        this.logger.log('Running initial sync on startup...');
        // Fire syncs in the background to not block startup
        this.handleNbaSync().catch(e => this.logger.error(e));
        this.handleSoccerSync().catch(e => this.logger.error(e));
        this.handleNhlSync().catch(e => this.logger.error(e));
        this.handleNbaStandingsSync().catch(e => this.logger.error(e));
        this.handleSoccerStandingsSync().catch(e => this.logger.error(e));
        this.handleNhlStandingsSync().catch(e => this.logger.error(e));
        this.handleLibertadoresSync().catch(e => this.logger.error(e));
        this.handleLibertadoresStandingsSync().catch(e => this.logger.error(e));
        // Force full fetch of the entire Libertadores fixture on startup
        this.syncLeague('soccer', 'conmebol.libertadores', 'LIBERTADORES', ['2026']).catch(e => this.logger.error(e));
    }

    /**
     * Retrieves all matches for a given league from the database.
     * Implements a 1-minute cache to reduce DB load.
     */
    async findAll(league: string): Promise<Match[]> {
        const cacheKey = `${league.toLowerCase()}_matches_dashboard`;
        const cached = await this.cacheManager.get<Match[]>(cacheKey);
        if (cached) return cached;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const matches = await this.prisma.match.findMany({
            where: {
                league: league.toUpperCase(),
                startTime: {
                    gte: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
                }
            },
            include: { odds: true },
            orderBy: { startTime: 'asc' },
        });

        const results = matches.map(m => ({
            ...m,
            startTime: m.startTime.toISOString()
        })) as unknown as Match[];

        await this.cacheManager.set(cacheKey, results, 60000); // 1 min cache
        return results;
    }

    /**
     * Retrieves league standings.
     * Implements a 5-minute cache.
     */
    async getStandings(league: string): Promise<TeamRanking[]> {
        const cacheKey = `${league.toLowerCase()}_standings`;
        const cached = await this.cacheManager.get<TeamRanking[]>(cacheKey);
        if (cached) return cached;

        const rankings = await this.prisma.teamRanking.findMany({
            where: { league: league.toUpperCase() },
            orderBy: [
                { conference: 'asc' },
                { seed: 'asc' }
            ]
        });
        const results = rankings as unknown as TeamRanking[];
        await this.cacheManager.set(cacheKey, results, 300000); // 5 min cache
        return results;
    }

    /**
     * Automated sync for NBA matches every minute.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleNbaSync() {
        await this.syncLeague('basketball', 'nba', 'NBA');
    }

    /**
     * Automated sync for Soccer (Argentine Primera) every minute.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleSoccerSync() {
        await this.syncLeague('soccer', 'arg.1', 'SOCCER');
    }

    /**
     * Automated sync for Copa Libertadores every minute.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleLibertadoresSync() {
        await this.syncLeague('soccer', 'conmebol.libertadores', 'LIBERTADORES');
    }

    /**
     * Automated sync for NHL Hockey every minute.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleNhlSync() {
        await this.syncLeague('hockey', 'nhl', 'NHL');
    }

    /**
     * Main synchronization logic: 
     * 1. Fetches data for Yesterday, Today, and Tomorrow from ESPN.
     * 2. Upserts match and score data.
     * 3. Broadcasts live updates via WebSocket.
     * 4. Updates betting odds if available.
     */
    private async syncLeague(sport: string, espnLeague: string, dbLeague: string, customDates?: string[]) {
        try {
            let datesStrings: string[] = [];
            if (customDates) {
                datesStrings = customDates;
            } else {
                const today = new Date();
                datesStrings = [
                    new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ''), // Yesterday
                    today.toISOString().split('T')[0].replace(/-/g, ''),                                         // Today
                    new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '')  // Tomorrow
                ];
            }

            for (const dateStr of datesStrings) {
                const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${espnLeague}/scoreboard?dates=${dateStr}&limit=300`;
                const { data } = await axios.get(url);
                const events = data.events || [];

                for (const event of events) {
                    const comp = event.competitions?.[0];
                    if (!comp) continue;

                    const home = comp.competitors?.find((c) => c.homeAway === 'home');
                    const away = comp.competitors?.find((c) => c.homeAway === 'away');
                    if (!home || !away) continue;

                    const state = event.status?.type?.state;
                    const completed = event.status?.type?.completed;

                    const status = state === 'in' ? 'LIVE' :
                        completed ? 'FINISHED' : 'SCHEDULED';
                    
                    let clock = status === 'FINISHED' ? 'FINAL' : (event.status?.displayClock || '');
                    
                    // Add period/quarter for NBA
                    if (status === 'LIVE' && dbLeague === 'NBA') {
                        const period = event.status?.period;
                        if (period) {
                            clock = `Q${period} ${clock}`;
                        }
                    }

                    // Extract statistics
                    const homeLinescores = (home.linescores || []).map((l, i) => ({ period: i + 1, value: l.value }));
                    const awayLinescores = (away.linescores || []).map((l, i) => ({ period: i + 1, value: l.value }));
                    
                    const leaders = (comp.leaders || []).map(cat => ({
                        name: cat.name,
                        value: cat.leaders?.[0]?.displayValue || '',
                        athlete: {
                            displayName: cat.leaders?.[0]?.athlete?.displayName || '',
                            headshot: cat.leaders?.[0]?.athlete?.headshot || '',
                            position: cat.leaders?.[0]?.athlete?.position?.abbreviation || ''
                        }
                    })).filter(l => l.athlete.displayName);

                    const match = await this.prisma.match.upsert({
                        where: { externalId: event.id },
                        update: {
                            homeScore: parseInt(home.score) || 0,
                            awayScore: parseInt(away.score) || 0,
                            homeLogo: home.team.logo || null,
                            awayLogo: away.team.logo || null,
                            status: status,
                            currentClock: clock,
                            homeLinescores: homeLinescores as any,
                            awayLinescores: awayLinescores as any,
                            leaders: leaders as any,
                            updatedAt: new Date(),
                        },
                        create: {
                            externalId: event.id,
                            sport: sport,
                            league: dbLeague,
                            homeTeam: home.team.displayName,
                            awayTeam: away.team.displayName,
                            homeLogo: home.team.logo || null,
                            awayLogo: away.team.logo || null,
                            homeScore: parseInt(home.score) || 0,
                            awayScore: parseInt(away.score) || 0,
                            status: status,
                            startTime: new Date(event.date),
                            currentClock: clock,
                            homeLinescores: homeLinescores as any,
                            awayLinescores: awayLinescores as any,
                            leaders: leaders as any,
                        },
                    });

                    this.wsGateway.broadcastMatchUpdate(match as unknown as Match);

                    // Sync Odds
                    if (comp.odds && comp.odds.length > 0 && comp.odds[0]) {
                        const oddData = comp.odds[0];
                        await this.prisma.odds.upsert({
                            where: {
                                matchId_provider: {
                                    matchId: match.id,
                                    provider: oddData.provider?.name || 'ESPN BET',
                                },
                            },
                            update: {
                                homeWin: parseFloat(oddData.homeTeamOdds?.moneyLine || oddData.home?.moneyLine) || null,
                                awayWin: parseFloat(oddData.awayTeamOdds?.moneyLine || oddData.away?.moneyLine) || null,
                                draw: parseFloat(oddData.drawOdds?.moneyLine || oddData.draw?.moneyLine) || null,
                            },
                            create: {
                                matchId: match.id,
                                provider: oddData.provider?.name || 'ESPN BET',
                                homeWin: parseFloat(oddData.homeTeamOdds?.moneyLine || oddData.home?.moneyLine) || null,
                                awayWin: parseFloat(oddData.awayTeamOdds?.moneyLine || oddData.away?.moneyLine) || null,
                                draw: parseFloat(oddData.drawOdds?.moneyLine || oddData.draw?.moneyLine) || null,
                            },
                        });
                        this.wsGateway.broadcastOddsUpdate({
                            matchId: match.id,
                            provider: oddData.provider?.name || 'ESPN BET',
                            homeWin: parseFloat(oddData.homeTeamOdds?.moneyLine || oddData.home?.moneyLine) || null,
                            awayWin: parseFloat(oddData.awayTeamOdds?.moneyLine || oddData.away?.moneyLine) || null,
                            draw: parseFloat(oddData.drawOdds?.moneyLine || oddData.draw?.moneyLine) || null,
                        });
                    }
                }
            }


            await this.cacheManager.del(`${dbLeague.toLowerCase()}_matches_dashboard`);
        } catch (error) {
            this.logger.error(`Error syncing ${dbLeague}:`, error.message);
        }
    }

    /**
     * Syncs NBA standings every minute.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleNbaStandingsSync() {
        await this.syncStandings('basketball', 'nba', 'NBA');
    }

    /**
     * Syncs Soccer standings every 12 hours.
     */
    @Cron(CronExpression.EVERY_12_HOURS)
    async handleSoccerStandingsSync() {
        await this.syncStandings('soccer', 'arg.1', 'SOCCER');
    }

    /**
     * Syncs Copa Libertadores standings every 12 hours.
     */
    @Cron(CronExpression.EVERY_12_HOURS)
    async handleLibertadoresStandingsSync() {
        await this.syncStandings('soccer', 'conmebol.libertadores', 'LIBERTADORES');
    }

    /**
     * Syncs NHL standings every 12 hours.
     */
    @Cron(CronExpression.EVERY_12_HOURS)
    async handleNhlStandingsSync() {
        await this.syncStandings('hockey', 'nhl', 'NHL');
    }

    /**
     * Processes standings data from ESPN and updates the database.
     */
    private async syncStandings(sport: string, espnLeague: string, dbLeague: string) {
        try {
            const url = `https://site.api.espn.com/apis/v2/sports/${sport}/${espnLeague}/standings`;
            const { data } = await axios.get(url);

            const groups = data.children || (data.standings ? [data] : []);
            for (const group of groups) {
                const confName = group.name || 'General';
                const teams = (group.standings?.entries || group.entries) || [];

                for (const entry of teams) {
                    const team = entry.team;
                    const stats = entry.stats;

                    const getValue = (name: string) => stats.find(s => s.name === name)?.value || 0;
                    const getDisplayValue = (name: string) => stats.find(s => s.name === name)?.displayValue || '';

                    const wins = getValue('wins');
                    const losses = getValue('losses');
                    const draws = getValue('ties') || getValue('draws');
                    const goalsFor = getValue('pointsFor') || getValue('goalsFor');
                    const goalsAgainst = getValue('pointsAgainst') || getValue('goalsAgainst');
                    const points = getValue('points');
                    
                    const pct = stats.find(s => ['winPercent', 'points'].includes(s.name))?.value || 0;
                    const seed = stats.find(s => ['rank', 'playoffSeed'].includes(s.name))?.value || 0;
                    const gamesBehind = stats.find(s => s.name === 'gamesBehind')?.value || 0;
                    const streak = stats.find(s => s.name === 'streak')?.displayValue || '';

                    await this.prisma.teamRanking.upsert({
                        where: {
                            league_teamName: {
                                league: dbLeague,
                                teamName: team.displayName
                            }
                        },
                        update: {
                            wins: Math.floor(wins),
                            draws: Math.floor(draws),
                            losses: Math.floor(losses),
                            goalsFor: Math.floor(goalsFor),
                            goalsAgainst: Math.floor(goalsAgainst),
                            points: Math.floor(points),
                            pct: parseFloat(pct.toString()),
                            seed: Math.floor(seed),
                            gamesBehind: parseFloat(gamesBehind.toString()),
                            streak: streak,
                            teamAbbr: team.abbreviation,
                            teamLogo: team.logos?.[0]?.href || null,
                            lastUpdateAt: new Date()
                        },
                        create: {
                            league: dbLeague,
                            conference: confName,
                            teamName: team.displayName,
                            teamAbbr: team.abbreviation,
                            teamLogo: team.logos?.[0]?.href || null,
                            wins: Math.floor(wins),
                            draws: Math.floor(draws),
                            losses: Math.floor(losses),
                            goalsFor: Math.floor(goalsFor),
                            goalsAgainst: Math.floor(goalsAgainst),
                            points: Math.floor(points),
                            pct: parseFloat(pct.toString()),
                            seed: Math.floor(seed),
                            gamesBehind: parseFloat(gamesBehind.toString()),
                            streak: streak
                        }
                    });
                }
            }

            await this.cacheManager.del(`${dbLeague.toLowerCase()}_standings`);
        } catch (error) {
            this.logger.error(`Error syncing Standings ${dbLeague}:`, error.message);
        }
    }
}
