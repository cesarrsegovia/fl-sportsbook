"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GradingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const axios_1 = require("@nestjs/axios");
const prisma_1 = require("@sportsbook/prisma");
const crypto = __importStar(require("crypto"));
const rxjs_1 = require("rxjs");
let GradingService = GradingService_1 = class GradingService {
    prisma;
    http;
    gradingQueue;
    logger = new common_1.Logger(GradingService_1.name);
    constructor(prisma, http, gradingQueue) {
        this.prisma = prisma;
        this.http = http;
        this.gradingQueue = gradingQueue;
    }
    async gradeEvent(eventId) {
        const event = await this.prisma.sportsbookEvent.findUnique({
            where: { id: eventId },
            include: {
                match: { include: { odds: true } },
                markets: {
                    include: {
                        selections: {
                            include: {
                                quotes: {
                                    where: {
                                        status: 'ACCEPTED',
                                        ticket: { status: 'CONFIRMED' },
                                    },
                                    include: {
                                        ticket: { include: { gradingRecord: true } },
                                    },
                                },
                                parlayLegs: {
                                    where: {
                                        outcome: null,
                                        ticket: { status: 'CONFIRMED' },
                                    },
                                    include: {
                                        ticket: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!event) {
            this.logger.warn(`Event ${eventId} not found for grading`);
            return;
        }
        if (event.match.status !== 'FINISHED') {
            this.logger.warn(`Event ${eventId} match not finished yet, skipping`);
            return;
        }
        const result = await this.fetchOfficialResult(event.match);
        if (!result) {
            this.logger.error(`Could not fetch official result for match ${event.match.id}`);
            return;
        }
        for (const market of event.markets) {
            for (const selection of market.selections) {
                const outcome = this.determineOutcome({
                    selection,
                    market,
                    result,
                });
                for (const quote of selection.quotes) {
                    const ticket = quote.ticket;
                    if (!ticket || ticket.gradingRecord)
                        continue;
                    await this.gradeTicket({
                        ticket,
                        quote,
                        selection,
                        market,
                        outcome,
                        result,
                    });
                }
                for (const leg of selection.parlayLegs) {
                    if (leg.outcome)
                        continue;
                    await this.gradeParlayLeg({
                        ticketId: leg.ticketId,
                        selectionId: selection.id,
                        outcome,
                    });
                }
            }
        }
    }
    async gradeTicket(params) {
        const { ticket, quote, outcome, result } = params;
        let gradingRecord;
        try {
            gradingRecord = await this.prisma.gradingRecord.create({
                data: {
                    ticketId: ticket.id,
                    outcome: outcome,
                    resultSource: 'ESPN_API',
                    resultRaw: result,
                    gradedBy: 'system',
                    notes: outcome === 'MANUAL_REVIEW'
                        ? `Unable to determine outcome automatically. Result: ${JSON.stringify(result)}`
                        : null,
                },
            });
        }
        catch (err) {
            if (err?.code === 'P2002') {
                this.logger.warn(`Ticket ${ticket.id} already graded, skipping`);
                return;
            }
            throw err;
        }
        const newTicketStatus = this.outcomeToTicketStatus(outcome);
        await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: newTicketStatus },
        });
        this.logger.log(`Ticket ${ticket.id} graded as ${outcome}`);
        if (outcome === 'WIN' || outcome === 'REFUND') {
            await this.createSettlementJob({
                ticket,
                quote,
                gradingRecord,
                outcome,
                amount: this.computeSinglePayout(quote, outcome),
            });
        }
        await this.broadcastTicketUpdate(ticket.id, ticket.userId, newTicketStatus);
    }
    async gradeParlayLeg(params) {
        const { ticketId, selectionId, outcome } = params;
        const existingLeg = await this.prisma.parlayLeg.findUnique({
            where: { ticketId_selectionId: { ticketId, selectionId } },
        });
        if (!existingLeg) {
            this.logger.warn(`ParlayLeg ticket=${ticketId} selection=${selectionId} not found`);
            return;
        }
        if (existingLeg.outcome) {
            this.logger.warn(`ParlayLeg ticket=${ticketId} selection=${selectionId} already graded`);
            return;
        }
        await this.prisma.parlayLeg.update({
            where: { ticketId_selectionId: { ticketId, selectionId } },
            data: { outcome: outcome, gradedAt: new Date() },
        });
        if (outcome === 'LOSS') {
            await this.resolveParlay(ticketId, 'LOSS');
            return;
        }
        const allLegs = await this.prisma.parlayLeg.findMany({
            where: { ticketId },
        });
        const pending = allLegs.filter((l) => !l.outcome);
        if (pending.length > 0)
            return;
        const hasLoss = allLegs.some((l) => l.outcome === 'LOSS');
        const allVoid = allLegs.every((l) => l.outcome === 'VOID');
        const activeLegs = allLegs.filter((l) => l.outcome !== 'VOID' && l.outcome !== 'REFUND');
        if (hasLoss) {
            await this.resolveParlay(ticketId, 'LOSS');
        }
        else if (allVoid) {
            await this.resolveParlay(ticketId, 'VOID');
        }
        else if (activeLegs.every((l) => l.outcome === 'WIN')) {
            await this.resolveParlay(ticketId, 'WIN');
        }
        else {
            await this.resolveParlay(ticketId, 'MANUAL_REVIEW');
        }
    }
    async resolveParlay(ticketId, finalOutcome) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                quote: true,
                parlayLegs: { include: { selection: true } },
            },
        });
        if (!ticket || !ticket.quote) {
            this.logger.warn(`Parlay ticket ${ticketId} not found for resolution`);
            return;
        }
        const existingGrading = await this.prisma.gradingRecord.findUnique({
            where: { ticketId },
        });
        if (existingGrading) {
            this.logger.warn(`Parlay ticket ${ticketId} already has grading record`);
            return;
        }
        let finalOdds = ticket.quote.oddsAtQuote;
        if (finalOutcome === 'WIN') {
            const active = ticket.parlayLegs.filter((l) => l.outcome === 'WIN');
            finalOdds = active.reduce((acc, l) => acc * l.oddsValue, 1);
        }
        const finalPayout = finalOutcome === 'WIN'
            ? ticket.quote.stake * finalOdds
            : finalOutcome === 'REFUND' || finalOutcome === 'VOID'
                ? ticket.quote.stake
                : 0;
        const gradingRecord = await this.prisma.gradingRecord.create({
            data: {
                ticketId,
                outcome: finalOutcome,
                resultSource: 'PARLAY_AUTO',
                gradedBy: 'system',
                notes: `Parlay resolved. Final odds: ${finalOdds.toFixed(4)}. Payout: ${finalPayout.toFixed(2)}`,
            },
        });
        const newStatus = this.outcomeToTicketStatus(finalOutcome);
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: newStatus },
        });
        this.logger.log(`Parlay ${ticketId} resolved as ${finalOutcome}`);
        if (finalOutcome === 'WIN' ||
            finalOutcome === 'VOID' ||
            finalOutcome === 'REFUND') {
            const settlementOutcome = finalOutcome === 'VOID' ? 'REFUND' : finalOutcome;
            await this.createSettlementJob({
                ticket,
                quote: ticket.quote,
                gradingRecord,
                outcome: settlementOutcome,
                amount: finalPayout,
            });
        }
        await this.broadcastTicketUpdate(ticketId, ticket.userId, newStatus);
    }
    computeSinglePayout(quote, outcome) {
        if (outcome === 'WIN') {
            if (quote.isFreeBet && quote.freeBetAmount) {
                return Math.max(0, quote.expectedPayout - quote.freeBetAmount);
            }
            return quote.expectedPayout;
        }
        if (outcome === 'REFUND')
            return quote.stake;
        return 0;
    }
    determineOutcome(params) {
        const { selection, market, result } = params;
        if (result.cancelled)
            return 'VOID';
        if (result.conflicting)
            return 'MANUAL_REVIEW';
        if (market.type === 'MATCH_WINNER') {
            if (result.homeScore === null || result.awayScore === null)
                return 'VOID';
            return this.gradeMatchWinner(selection.name, result);
        }
        if (market.type === 'OVER_UNDER') {
            return this.gradeOverUnder(selection.name, result);
        }
        if (market.type === 'BOTH_TEAMS_TO_SCORE') {
            if (result.homeScore === null || result.awayScore === null)
                return 'MANUAL_REVIEW';
            const bothScored = result.homeScore > 0 && result.awayScore > 0;
            if (selection.name === 'yes')
                return bothScored ? 'WIN' : 'LOSS';
            if (selection.name === 'no')
                return !bothScored ? 'WIN' : 'LOSS';
            return 'MANUAL_REVIEW';
        }
        if (market.type === 'DOUBLE_CHANCE') {
            if (result.homeScore === null || result.awayScore === null)
                return 'MANUAL_REVIEW';
            const homeWins = result.homeScore > result.awayScore;
            const awayWins = result.awayScore > result.homeScore;
            const draw = result.homeScore === result.awayScore;
            if (selection.name === '1X')
                return homeWins || draw ? 'WIN' : 'LOSS';
            if (selection.name === 'X2')
                return awayWins || draw ? 'WIN' : 'LOSS';
            if (selection.name === '12')
                return homeWins || awayWins ? 'WIN' : 'LOSS';
            return 'MANUAL_REVIEW';
        }
        if (market.type === 'HALF_TIME_RESULT') {
            const htHome = result.homeLinescores?.[0]?.value ?? null;
            const htAway = result.awayLinescores?.[0]?.value ?? null;
            if (htHome === null || htAway === null)
                return 'MANUAL_REVIEW';
            if (selection.name === 'home')
                return htHome > htAway ? 'WIN' : 'LOSS';
            if (selection.name === 'away')
                return htAway > htHome ? 'WIN' : 'LOSS';
            if (selection.name === 'draw')
                return htHome === htAway ? 'WIN' : 'LOSS';
            return 'MANUAL_REVIEW';
        }
        return 'MANUAL_REVIEW';
    }
    gradeMatchWinner(selectionName, result) {
        const { homeScore, awayScore, homeWinner, awayWinner } = result;
        if (homeWinner !== null && awayWinner !== null) {
            if (selectionName === 'home')
                return homeWinner ? 'WIN' : 'LOSS';
            if (selectionName === 'away')
                return awayWinner ? 'WIN' : 'LOSS';
            if (selectionName === 'draw') {
                return !homeWinner && !awayWinner ? 'WIN' : 'LOSS';
            }
        }
        if (homeScore === null || awayScore === null)
            return 'MANUAL_REVIEW';
        if (selectionName === 'home') {
            if (homeScore > awayScore)
                return 'WIN';
            return 'LOSS';
        }
        if (selectionName === 'away') {
            if (awayScore > homeScore)
                return 'WIN';
            return 'LOSS';
        }
        if (selectionName === 'draw') {
            return homeScore === awayScore ? 'WIN' : 'LOSS';
        }
        return 'MANUAL_REVIEW';
    }
    gradeOverUnder(selectionName, result) {
        const { homeScore, awayScore, overUnderLine } = result;
        if (homeScore === null || awayScore === null || overUnderLine === null) {
            return 'MANUAL_REVIEW';
        }
        const total = homeScore + awayScore;
        if (total === overUnderLine)
            return 'REFUND';
        if (selectionName === 'over')
            return total > overUnderLine ? 'WIN' : 'LOSS';
        if (selectionName === 'under')
            return total < overUnderLine ? 'WIN' : 'LOSS';
        return 'MANUAL_REVIEW';
    }
    outcomeToTicketStatus(outcome) {
        const map = {
            WIN: 'WON',
            LOSS: 'LOST',
            VOID: 'VOID',
            REFUND: 'REFUNDED',
            MANUAL_REVIEW: 'MANUAL_REVIEW',
        };
        return map[outcome] ?? 'MANUAL_REVIEW';
    }
    async fetchOfficialResult(match) {
        try {
            const sportPath = this.buildEspnPath(match.sport, match.league);
            const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;
            const dateStr = new Date(match.startTime)
                .toISOString()
                .split('T')[0]
                .replace(/-/g, '');
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`${url}?dates=${dateStr}&limit=100`));
            const data = response.data;
            const espnEvent = (data.events || []).find((e) => e.id === match.externalId);
            if (!espnEvent) {
                this.logger.warn(`ESPN event ${match.externalId} not found in scoreboard`);
                return null;
            }
            const completed = espnEvent.status?.type?.completed === true;
            const state = espnEvent.status?.type?.state;
            if (!completed || state !== 'post') {
                this.logger.warn(`Match ${match.externalId} not yet in completed state`);
                return null;
            }
            const comp = espnEvent.competitions?.[0];
            if (!comp)
                return null;
            const home = comp.competitors?.find((c) => c.homeAway === 'home');
            const away = comp.competitors?.find((c) => c.homeAway === 'away');
            if (!home || !away)
                return null;
            const overUnderLine = comp.odds?.[0]?.overUnder ?? null;
            const homeLinescores = (home.linescores || []).map((l, i) => ({ period: i + 1, value: l.value }));
            const awayLinescores = (away.linescores || []).map((l, i) => ({ period: i + 1, value: l.value }));
            return {
                externalEventId: match.externalId,
                homeScore: parseInt(home.score) ?? null,
                awayScore: parseInt(away.score) ?? null,
                homeWinner: home.winner ?? null,
                awayWinner: away.winner ?? null,
                overUnderLine,
                homeLinescores,
                awayLinescores,
                cancelled: false,
                conflicting: false,
                fetchedAt: new Date(),
                raw: espnEvent,
            };
        }
        catch (error) {
            this.logger.error(`Error fetching result for match ${match.externalId}:`, error?.message);
            return null;
        }
    }
    buildEspnPath(sport, league) {
        const leagueMap = {
            NBA: 'basketball/nba',
            NHL: 'hockey/nhl',
            SOCCER: 'soccer/arg.1',
            LIBERTADORES: 'soccer/conmebol.libertadores',
            MLB: 'baseball/mlb',
            NFL: 'football/nfl',
            UCL: 'soccer/uefa.champions',
            EPL: 'soccer/eng.1',
        };
        return leagueMap[league] || `${sport}/${league.toLowerCase()}`;
    }
    async createSettlementJob(params) {
        const { ticket, gradingRecord, outcome, amount } = params;
        const idempotencyKey = this.generateIdempotencyKey(ticket.id, outcome, amount);
        const existing = await this.prisma.settlementJob.findUnique({
            where: { idempotencyKey },
        });
        if (existing) {
            this.logger.warn(`SettlementJob already exists for ticket ${ticket.id}, skipping`);
            return;
        }
        await this.prisma.settlementJob.create({
            data: {
                ticketId: ticket.id,
                gradingRecordId: gradingRecord.id,
                idempotencyKey,
                amount,
                toWallet: ticket.userId,
                status: 'PENDING',
            },
        });
        await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: 'SETTLING' },
        });
        this.logger.log(`SettlementJob created for ticket ${ticket.id}: ${amount} → ${ticket.userId}`);
    }
    generateIdempotencyKey(ticketId, outcome, amount) {
        return crypto
            .createHash('sha256')
            .update(`${ticketId}:${outcome}:${amount.toFixed(6)}`)
            .digest('hex');
    }
    async broadcastTicketUpdate(ticketId, userId, status) {
        try {
            await (0, rxjs_1.firstValueFrom)(this.http.post(`http://localhost:${process.env.PORT_SPORTSBOOK_API || 3000}/internal/broadcast-ticket`, { ticketId, userId, status }));
        }
        catch {
        }
    }
};
exports.GradingService = GradingService;
exports.GradingService = GradingService = GradingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)('grading')),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        axios_1.HttpService,
        bullmq_2.Queue])
], GradingService);
//# sourceMappingURL=grading.service.js.map