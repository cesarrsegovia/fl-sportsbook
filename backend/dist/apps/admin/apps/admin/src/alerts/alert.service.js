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
var AlertService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_1 = require("@sportsbook/prisma");
let AlertService = AlertService_1 = class AlertService {
    prisma;
    logger = new common_1.Logger(AlertService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async evaluateAlerts() {
        await this.checkFeedStaleness();
        await this.checkManualReviewBacklog();
        await this.checkSettlementBacklog();
    }
    async checkFeedStaleness() {
        const thresholdSeconds = parseInt(process.env.FEED_STALE_THRESHOLD_SECONDS || '180');
        const staleThreshold = new Date(Date.now() - thresholdSeconds * 1000);
        const staleEvents = await this.prisma.sportsbookEvent.findMany({
            where: {
                status: 'ACTIVE',
                feedFreshAt: { lt: staleThreshold },
            },
            include: { match: { select: { league: true } } },
        });
        if (staleEvents.length > 0) {
            const leagues = [
                ...new Set(staleEvents.map((e) => e.match.league)),
            ];
            this.logger.warn(`ALERT: Stale feed detected for leagues: ${leagues.join(', ')}`);
        }
    }
    async checkManualReviewBacklog() {
        const count = await this.prisma.ticket.count({
            where: { status: 'MANUAL_REVIEW' },
        });
        if (count > 0) {
            this.logger.warn(`ALERT: ${count} tickets pending manual review`);
        }
    }
    async checkSettlementBacklog() {
        const count = await this.prisma.settlementJob.count({
            where: { status: 'MANUAL_INTERVENTION' },
        });
        if (count > 0) {
            this.logger.warn(`ALERT: ${count} settlement jobs in MANUAL_INTERVENTION`);
        }
    }
};
exports.AlertService = AlertService;
__decorate([
    (0, schedule_1.Cron)('0 */2 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AlertService.prototype, "evaluateAlerts", null);
exports.AlertService = AlertService = AlertService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], AlertService);
//# sourceMappingURL=alert.service.js.map