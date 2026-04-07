"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const cache_manager_1 = require("@nestjs/cache-manager");
const axios_1 = __importDefault(require("axios"));
const odds_gateway_1 = require("../websocket/odds/odds.gateway");
const prisma_service_1 = require("../prisma/prisma.service");
let SportsService = SportsService_1 = class SportsService {
    prisma;
    wsGateway;
    cacheManager;
    logger = new common_1.Logger(SportsService_1.name);
    constructor(prisma, wsGateway, cacheManager) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
        this.cacheManager = cacheManager;
    }
    async onModuleInit() {
        this.logger.log('Running initial sync on startup...');
        this.handleNbaSync().catch(e => this.logger.error(e));
        this.handleSoccerSync().catch(e => this.logger.error(e));
        this.handleNhlSync().catch(e => this.logger.error(e));
        this.handleNbaStandingsSync().catch(e => this.logger.error(e));
        this.handleSoccerStandingsSync().catch(e => this.logger.error(e));
        this.handleNhlStandingsSync().catch(e => this.logger.error(e));
        this.handleLibertadoresSync().catch(e => this.logger.error(e));
        this.handleLibertadoresStandingsSync().catch(e => this.logger.error(e));
        this.syncLeague('soccer', 'conmebol.libertadores', 'LIBERTADORES', ['2026']).catch(e => this.logger.error(e));
    }
    async findAll(league) {
        const cacheKey = `${league.toLowerCase()}_matches_dashboard`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
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
        }));
        await this.cacheManager.set(cacheKey, results, 60000);
        return results;
    }
    async getStandings(league) {
        const cacheKey = `${league.toLowerCase()}_standings`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const rankings = await this.prisma.teamRanking.findMany({
            where: { league: league.toUpperCase() },
            orderBy: [
                { conference: 'asc' },
                { seed: 'asc' }
            ]
        });
        const results = rankings;
        await this.cacheManager.set(cacheKey, results, 300000);
        return results;
    }
    async handleNbaSync() {
        await this.syncLeague('basketball', 'nba', 'NBA');
    }
    async handleSoccerSync() {
        await this.syncLeague('soccer', 'arg.1', 'SOCCER');
    }
    async handleLibertadoresSync() {
        await this.syncLeague('soccer', 'conmebol.libertadores', 'LIBERTADORES');
    }
    async handleNhlSync() {
        await this.syncLeague('hockey', 'nhl', 'NHL');
    }
    async syncLeague(sport, espnLeague, dbLeague, customDates) {
        try {
            let datesStrings = [];
            if (customDates) {
                datesStrings = customDates;
            }
            else {
                const today = new Date();
                datesStrings = [
                    new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ''),
                    today.toISOString().split('T')[0].replace(/-/g, ''),
                    new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '')
                ];
            }
            for (const dateStr of datesStrings) {
                const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${espnLeague}/scoreboard?dates=${dateStr}&limit=300`;
                const { data } = await axios_1.default.get(url);
                const events = data.events || [];
                for (const event of events) {
                    const comp = event.competitions?.[0];
                    if (!comp)
                        continue;
                    const home = comp.competitors?.find((c) => c.homeAway === 'home');
                    const away = comp.competitors?.find((c) => c.homeAway === 'away');
                    if (!home || !away)
                        continue;
                    const state = event.status?.type?.state;
                    const completed = event.status?.type?.completed;
                    const status = state === 'in' ? 'LIVE' :
                        completed ? 'FINISHED' : 'SCHEDULED';
                    let clock = status === 'FINISHED' ? 'FINAL' : (event.status?.displayClock || '');
                    if (status === 'LIVE' && dbLeague === 'NBA') {
                        const period = event.status?.period;
                        if (period) {
                            clock = `Q${period} ${clock}`;
                        }
                    }
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
                            homeLinescores: homeLinescores,
                            awayLinescores: awayLinescores,
                            leaders: leaders,
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
                            homeLinescores: homeLinescores,
                            awayLinescores: awayLinescores,
                            leaders: leaders,
                        },
                    });
                    this.wsGateway.broadcastMatchUpdate(match);
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
        }
        catch (error) {
            this.logger.error(`Error syncing ${dbLeague}:`, error.message);
        }
    }
    async handleNbaStandingsSync() {
        await this.syncStandings('basketball', 'nba', 'NBA');
    }
    async handleSoccerStandingsSync() {
        await this.syncStandings('soccer', 'arg.1', 'SOCCER');
    }
    async handleLibertadoresStandingsSync() {
        await this.syncStandings('soccer', 'conmebol.libertadores', 'LIBERTADORES');
    }
    async handleNhlStandingsSync() {
        await this.syncStandings('hockey', 'nhl', 'NHL');
    }
    async syncStandings(sport, espnLeague, dbLeague) {
        try {
            const url = `https://site.api.espn.com/apis/v2/sports/${sport}/${espnLeague}/standings`;
            const { data } = await axios_1.default.get(url);
            const groups = data.children || (data.standings ? [data] : []);
            for (const group of groups) {
                const confName = group.name || 'General';
                const teams = (group.standings?.entries || group.entries) || [];
                for (const entry of teams) {
                    const team = entry.team;
                    const stats = entry.stats;
                    const getValue = (name) => stats.find(s => s.name === name)?.value || 0;
                    const getDisplayValue = (name) => stats.find(s => s.name === name)?.displayValue || '';
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
        }
        catch (error) {
            this.logger.error(`Error syncing Standings ${dbLeague}:`, error.message);
        }
    }
};
exports.SportsService = SportsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleNbaSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleSoccerSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleLibertadoresSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleNhlSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleNbaStandingsSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_12_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleSoccerStandingsSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_12_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleLibertadoresStandingsSync", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_12_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportsService.prototype, "handleNhlStandingsSync", null);
exports.SportsService = SportsService = SportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        odds_gateway_1.OddsGateway, Object])
], SportsService);
//# sourceMappingURL=sports.service.js.map