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
var QuoteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QuoteService = QuoteService_1 = class QuoteService {
    prisma;
    logger = new common_1.Logger(QuoteService_1.name);
    QUOTE_TTL_SECONDS = parseInt(process.env.QUOTE_TTL_SECONDS || '20');
    MAX_STAKE = parseFloat(process.env.MAX_STAKE_USD || '1000');
    MAX_PAYOUT = parseFloat(process.env.MAX_PAYOUT_USD || '10000');
    constructor(prisma) {
        this.prisma = prisma;
    }
    async requestQuote(dto) {
        const { selectionId, stake, userId } = dto;
        if (stake <= 0 || stake > this.MAX_STAKE) {
            throw new common_1.BadRequestException(`Stake must be between 0 and ${this.MAX_STAKE}`);
        }
        const selection = await this.prisma.selection.findUnique({
            where: { id: selectionId },
            include: {
                market: {
                    include: {
                        event: {
                            include: { match: true },
                        },
                    },
                },
            },
        });
        if (!selection)
            throw new common_1.NotFoundException('Selection not found');
        if (selection.market.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Market is suspended or closed');
        }
        const event = selection.market.event;
        if (event.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Event is not accepting bets');
        }
        const lockTime = new Date(event.lockTime);
        const lockTimeWithBuffer = new Date(lockTime.getTime() - 2000);
        if (new Date() >= lockTimeWithBuffer) {
            await this.prisma.sportsbookEvent.update({
                where: { id: event.id },
                data: { status: 'SUSPENDED' },
            });
            throw new common_1.BadRequestException('Event is locked — too close to start time');
        }
        const existingQuote = await this.prisma.quote.findFirst({
            where: {
                userId,
                selectionId,
                status: 'PENDING',
                expiresAt: { gt: new Date() },
            },
        });
        if (existingQuote) {
            return this.buildResponse(existingQuote, selection, event);
        }
        const freshOdds = await this.getLatestOddsForSelection(selection);
        const oddsDrift = Math.abs(freshOdds - selection.oddsValue) / selection.oddsValue;
        if (oddsDrift > 0.05) {
            await this.prisma.selection.update({
                where: { id: selectionId },
                data: { oddsValue: freshOdds },
            });
            throw new common_1.BadRequestException(JSON.stringify({
                code: 'ODDS_CHANGED',
                newOdds: freshOdds,
                message: 'Odds have changed. Please review and resubmit.',
            }));
        }
        const expectedPayout = stake * selection.oddsValue;
        if (expectedPayout > this.MAX_PAYOUT) {
            throw new common_1.BadRequestException(`Payout would exceed maximum of ${this.MAX_PAYOUT}`);
        }
        const expiresAt = new Date(Date.now() + this.QUOTE_TTL_SECONDS * 1000);
        const quote = await this.prisma.quote.create({
            data: {
                selectionId,
                userId,
                stake,
                oddsAtQuote: selection.oddsValue,
                expectedPayout,
                status: 'PENDING',
                expiresAt,
                txParams: this.buildTxParams({ stake, userId, quoteId: '' }),
            },
        });
        const txParams = this.buildTxParams({ stake, userId, quoteId: quote.id });
        await this.prisma.quote.update({
            where: { id: quote.id },
            data: { txParams },
        });
        return this.buildResponse({ ...quote, txParams }, selection, event);
    }
    buildResponse(quote, selection, event) {
        const txParams = quote.txParams;
        return {
            quoteId: quote.id,
            selectionId: quote.selectionId,
            stake: quote.stake,
            oddsAtQuote: quote.oddsAtQuote,
            expectedPayout: quote.expectedPayout,
            expiresAt: quote.expiresAt.toISOString(),
            ttlSeconds: this.QUOTE_TTL_SECONDS,
            txParams: {
                to: txParams.to,
                value: txParams.value,
                data: txParams.data,
                quoteId: txParams.quoteId,
            },
            match: {
                homeTeam: event.match.homeTeam,
                awayTeam: event.match.awayTeam,
                startTime: event.match.startTime,
                league: event.match.league,
            },
            selection: {
                name: selection.name,
                oddsValue: selection.oddsValue,
            },
        };
    }
    buildTxParams(params) {
        return {
            to: process.env.SPORTSBOOK_TREASURY_ADDRESS ||
                '0x0000000000000000000000000000000000000001',
            value: Math.floor(params.stake * 1e6).toString(),
            data: `0x${Buffer.from(params.quoteId).toString('hex')}`,
            quoteId: params.quoteId,
        };
    }
    async getLatestOddsForSelection(selection) {
        const match = selection.market.event.match;
        const odds = await this.prisma.odds.findFirst({
            where: { matchId: match.id },
            orderBy: { lastUpdateAt: 'desc' },
        });
        if (!odds)
            return selection.oddsValue;
        if (selection.name === 'home')
            return odds.homeWin ?? selection.oddsValue;
        if (selection.name === 'away')
            return odds.awayWin ?? selection.oddsValue;
        if (selection.name === 'draw')
            return odds.draw ?? selection.oddsValue;
        return selection.oddsValue;
    }
};
exports.QuoteService = QuoteService;
exports.QuoteService = QuoteService = QuoteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuoteService);
//# sourceMappingURL=quote.service.js.map