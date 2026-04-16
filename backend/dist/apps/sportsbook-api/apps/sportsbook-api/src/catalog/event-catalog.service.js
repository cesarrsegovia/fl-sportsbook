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
var EventCatalogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCatalogService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let EventCatalogService = EventCatalogService_1 = class EventCatalogService {
    prisma;
    logger = new common_1.Logger(EventCatalogService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async syncEventFromMatch(matchId) {
        try {
            const match = await this.prisma.match.findUnique({
                where: { id: matchId },
                include: { odds: { orderBy: { lastUpdateAt: 'desc' }, take: 1 } },
            });
            if (!match)
                return;
            const lockWindowMinutes = parseInt(process.env.EVENT_LOCK_WINDOW_MINUTES || '5');
            const lockTime = new Date(match.startTime.getTime() - lockWindowMinutes * 60 * 1000);
            const now = new Date();
            let eventStatus;
            if (match.status === 'FINISHED') {
                eventStatus = 'FINISHED';
            }
            else if (match.status === 'LIVE') {
                eventStatus = 'SUSPENDED';
            }
            else {
                eventStatus = now < lockTime ? 'ACTIVE' : 'SUSPENDED';
            }
            const sbEvent = await this.prisma.sportsbookEvent.upsert({
                where: { matchId },
                update: { status: eventStatus, lockTime, feedFreshAt: now },
                create: { matchId, status: eventStatus, lockTime, feedFreshAt: now },
            });
            const marketStatus = eventStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED';
            let market = await this.prisma.market.findFirst({
                where: { eventId: sbEvent.id, type: 'MATCH_WINNER' },
            });
            if (!market) {
                market = await this.prisma.market.create({
                    data: {
                        eventId: sbEvent.id,
                        type: 'MATCH_WINNER',
                        status: marketStatus,
                    },
                });
            }
            else if (market.status !== marketStatus) {
                market = await this.prisma.market.update({
                    where: { id: market.id },
                    data: { status: marketStatus },
                });
            }
            const odds = match.odds?.[0];
            if (odds) {
                const selectionDefs = [
                    { name: 'home', oddsValue: odds.homeWin },
                    { name: 'draw', oddsValue: odds.draw },
                    { name: 'away', oddsValue: odds.awayWin },
                ];
                for (const { name, oddsValue } of selectionDefs) {
                    if (oddsValue == null)
                        continue;
                    const existing = await this.prisma.selection.findFirst({
                        where: { marketId: market.id, name },
                    });
                    if (existing) {
                        await this.prisma.selection.update({
                            where: { id: existing.id },
                            data: { oddsValue },
                        });
                    }
                    else {
                        await this.prisma.selection.create({
                            data: { marketId: market.id, name, oddsValue },
                        });
                    }
                }
            }
        }
        catch (err) {
            this.logger.error(`syncEventFromMatch(${matchId}) failed:`, err.message);
        }
    }
    async suspendStaleEvents() {
        try {
            const now = new Date();
            const stale = await this.prisma.sportsbookEvent.findMany({
                where: { status: 'ACTIVE', lockTime: { lte: now } },
                select: { id: true },
            });
            if (stale.length === 0)
                return;
            const ids = stale.map((e) => e.id);
            await this.prisma.sportsbookEvent.updateMany({
                where: { id: { in: ids } },
                data: { status: 'SUSPENDED' },
            });
            await this.prisma.market.updateMany({
                where: { eventId: { in: ids }, status: 'ACTIVE' },
                data: { status: 'SUSPENDED' },
            });
            this.logger.log(`suspendStaleEvents: suspended ${stale.length} events`);
        }
        catch (err) {
            this.logger.error('suspendStaleEvents failed:', err.message);
        }
    }
    async checkFeedFreshness() {
        try {
            const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
            const stale = await this.prisma.sportsbookEvent.findMany({
                where: { status: 'ACTIVE', feedFreshAt: { lt: threeMinutesAgo } },
                select: { id: true },
            });
            for (const event of stale) {
                this.logger.warn(`Event ${event.id} has stale feed — suspending`);
                await this.prisma.sportsbookEvent.update({
                    where: { id: event.id },
                    data: { status: 'SUSPENDED' },
                });
            }
            this.logger.log(`checkFeedFreshness: ${stale.length} stale events suspended`);
        }
        catch (err) {
            this.logger.error('checkFeedFreshness failed:', err.message);
        }
    }
};
exports.EventCatalogService = EventCatalogService;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventCatalogService.prototype, "suspendStaleEvents", null);
__decorate([
    (0, schedule_1.Cron)('0 */5 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventCatalogService.prototype, "checkFeedFreshness", null);
exports.EventCatalogService = EventCatalogService = EventCatalogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventCatalogService);
//# sourceMappingURL=event-catalog.service.js.map