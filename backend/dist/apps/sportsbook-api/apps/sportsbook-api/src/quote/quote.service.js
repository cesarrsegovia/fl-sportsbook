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
const promotion_service_1 = require("../promotions/promotion.service");
let QuoteService = QuoteService_1 = class QuoteService {
    prisma;
    promotionService;
    logger = new common_1.Logger(QuoteService_1.name);
    QUOTE_TTL_SECONDS = parseInt(process.env.QUOTE_TTL_SECONDS || '20');
    MAX_STAKE = parseFloat(process.env.MAX_STAKE_USD || '1000');
    MAX_PAYOUT = parseFloat(process.env.MAX_PAYOUT_USD || '10000');
    MAX_PARLAY_STAKE = parseFloat(process.env.MAX_PARLAY_STAKE_USD || '200');
    MAX_PARLAY_PAYOUT = parseFloat(process.env.MAX_PARLAY_PAYOUT_USD || '50000');
    constructor(prisma, promotionService) {
        this.prisma = prisma;
        this.promotionService = promotionService;
    }
    async requestQuote(dto) {
        if (dto.selections && dto.selections.length > 0) {
            return this.requestParlayQuote(dto);
        }
        if (!dto.selectionId) {
            throw new common_1.BadRequestException('Either selectionId or selections must be provided');
        }
        return this.requestSingleQuote(dto);
    }
    async requestSingleQuote(dto) {
        const { stake, userId, promotionId } = dto;
        const selectionId = dto.selectionId;
        if (stake <= 0 || stake > this.MAX_STAKE) {
            throw new common_1.BadRequestException(`Stake must be between 0 and ${this.MAX_STAKE}`);
        }
        const selection = await this.prisma.selection.findUnique({
            where: { id: selectionId },
            include: {
                market: {
                    include: { event: { include: { match: true } } },
                },
            },
        });
        if (!selection)
            throw new common_1.NotFoundException('Selection not found');
        this.validateSelectionReady(selection);
        await this.validateSelectionForQuote(selection, userId, selectionId);
        const existing = await this.prisma.quote.findFirst({
            where: {
                userId,
                selectionId,
                status: 'PENDING',
                type: 'SINGLE',
                expiresAt: { gt: new Date() },
            },
        });
        if (existing) {
            return this.buildSingleResponse(existing, selection, selection.market.event);
        }
        const freshOdds = await this.getLatestOddsForSelection(selection);
        const oddsDrift = Math.abs(freshOdds - (selection.oddsValue ?? 0)) /
            (selection.oddsValue ?? 1);
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
        let effectiveOdds = selection.oddsValue ?? 0;
        let adjustedStake = stake;
        let isFreeBet = false;
        let freeBetAmount = 0;
        let appliedPromoId = null;
        if (promotionId) {
            const applied = await this.promotionService.applyPromotion({
                promotionId,
                userId,
                selectionId,
                stake,
            });
            appliedPromoId = applied.promotionId;
            adjustedStake = applied.adjustedStake;
            isFreeBet = applied.isFreeBet;
            freeBetAmount = applied.freeBetAmount;
            if (applied.boostedOdds != null)
                effectiveOdds = applied.boostedOdds;
        }
        const expectedPayout = stake * effectiveOdds;
        if (expectedPayout > this.MAX_PAYOUT) {
            throw new common_1.BadRequestException(`Payout would exceed maximum of ${this.MAX_PAYOUT}`);
        }
        const expiresAt = new Date(Date.now() + this.QUOTE_TTL_SECONDS * 1000);
        const quote = await this.prisma.quote.create({
            data: {
                selectionId,
                userId,
                stake,
                oddsAtQuote: effectiveOdds,
                expectedPayout,
                status: 'PENDING',
                type: 'SINGLE',
                expiresAt,
                txParams: this.buildTxParams({
                    stake: adjustedStake,
                    userId,
                    quoteId: '',
                }),
                promotionId: appliedPromoId,
                isFreeBet,
                freeBetAmount: isFreeBet ? freeBetAmount : null,
            },
        });
        const txParams = this.buildTxParams({
            stake: adjustedStake,
            userId,
            quoteId: quote.id,
        });
        await this.prisma.quote.update({
            where: { id: quote.id },
            data: { txParams },
        });
        return this.buildSingleResponse({ ...quote, txParams }, selection, selection.market.event);
    }
    async requestParlayQuote(dto) {
        const { selections, stake, userId } = dto;
        if (!selections || selections.length < 2) {
            throw new common_1.BadRequestException('Parlay requires at least 2 selections');
        }
        if (selections.length > 8) {
            throw new common_1.BadRequestException('Parlay maximum is 8 selections');
        }
        if (stake > this.MAX_PARLAY_STAKE) {
            throw new common_1.BadRequestException(`Parlay stake max is ${this.MAX_PARLAY_STAKE}`);
        }
        const loaded = await Promise.all(selections.map((s) => this.prisma.selection.findUnique({
            where: { id: s.selectionId },
            include: {
                market: {
                    include: { event: { include: { match: true } } },
                },
            },
        })));
        for (let i = 0; i < loaded.length; i++) {
            if (!loaded[i]) {
                throw new common_1.NotFoundException(`Selection ${selections[i].selectionId} not found`);
            }
        }
        const loadedSelections = loaded;
        const matchIds = loadedSelections.map((s) => s.market.event.matchId);
        if (new Set(matchIds).size !== matchIds.length) {
            throw new common_1.BadRequestException('Cannot combine two selections from the same match');
        }
        for (const sel of loadedSelections) {
            if (sel.market.type !== 'MATCH_WINNER' &&
                sel.market.type !== 'OVER_UNDER') {
                throw new common_1.BadRequestException(`Parlays only support MATCH_WINNER and OVER_UNDER in v1`);
            }
            this.validateSelectionReady(sel);
            await this.validateSelectionForQuote(sel, userId, sel.id);
        }
        const combinedOdds = loadedSelections.reduce((acc, s) => acc * (s.oddsValue ?? 1), 1);
        const expectedPayout = stake * combinedOdds;
        if (expectedPayout > this.MAX_PARLAY_PAYOUT) {
            throw new common_1.BadRequestException(`Parlay payout would exceed maximum of ${this.MAX_PARLAY_PAYOUT}`);
        }
        const expiresAt = new Date(Date.now() + this.QUOTE_TTL_SECONDS * 1000);
        const quote = await this.prisma.quote.create({
            data: {
                userId,
                stake,
                oddsAtQuote: combinedOdds,
                expectedPayout,
                status: 'PENDING',
                type: 'PARLAY',
                expiresAt,
                txParams: this.buildTxParams({ stake, userId, quoteId: '' }),
                parlayLegs: {
                    create: loadedSelections.map((s) => ({
                        selectionId: s.id,
                        oddsValue: s.oddsValue ?? 0,
                    })),
                },
            },
            include: { parlayLegs: true },
        });
        const txParams = this.buildTxParams({
            stake,
            userId,
            quoteId: quote.id,
        });
        await this.prisma.quote.update({
            where: { id: quote.id },
            data: { txParams },
        });
        return {
            quoteId: quote.id,
            type: 'PARLAY',
            stake,
            oddsAtQuote: combinedOdds,
            expectedPayout,
            expiresAt: expiresAt.toISOString(),
            ttlSeconds: this.QUOTE_TTL_SECONDS,
            txParams: {
                to: txParams.to,
                value: txParams.value,
                data: txParams.data,
                quoteId: txParams.quoteId,
            },
            legs: loadedSelections.map((s) => ({
                selectionId: s.id,
                matchHomeTeam: s.market.event.match.homeTeam,
                matchAwayTeam: s.market.event.match.awayTeam,
                selectionName: s.name,
                oddsValue: s.oddsValue ?? 0,
            })),
        };
    }
    validateSelectionReady(selection) {
        if (selection.oddsValue == null) {
            throw new common_1.BadRequestException('Selection has no odds available — market may be suspended');
        }
    }
    async validateSelectionForQuote(selection, _userId, _selectionId) {
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
    }
    buildSingleResponse(quote, selection, event) {
        const txParams = quote.txParams;
        return {
            quoteId: quote.id,
            type: 'SINGLE',
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
                oddsValue: selection.oddsValue ?? 0,
            },
            isFreeBet: !!quote.isFreeBet,
            freeBetAmount: quote.freeBetAmount ?? undefined,
        };
    }
    buildTxParams(params) {
        return {
            to: process.env.SPORTSBOOK_TREASURY_ADDRESS ||
                '0x0000000000000000000000000000000000000001',
            value: Math.floor(Math.max(0, params.stake) * 1e6).toString(),
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
            return selection.oddsValue ?? 0;
        if (selection.name === 'home')
            return odds.homeWin ?? selection.oddsValue ?? 0;
        if (selection.name === 'away')
            return odds.awayWin ?? selection.oddsValue ?? 0;
        if (selection.name === 'draw')
            return odds.draw ?? selection.oddsValue ?? 0;
        return selection.oddsValue ?? 0;
    }
};
exports.QuoteService = QuoteService;
exports.QuoteService = QuoteService = QuoteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        promotion_service_1.PromotionService])
], QuoteService);
//# sourceMappingURL=quote.service.js.map