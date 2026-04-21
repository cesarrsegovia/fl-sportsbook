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
var SettlementWatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementWatcherService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_1 = require("@sportsbook/prisma");
let SettlementWatcherService = SettlementWatcherService_1 = class SettlementWatcherService {
    prisma;
    settlementQueue;
    logger = new common_1.Logger(SettlementWatcherService_1.name);
    constructor(prisma, settlementQueue) {
        this.prisma = prisma;
        this.settlementQueue = settlementQueue;
    }
    async enqueuePendingSettlements() {
        const MAX_ATTEMPTS = parseInt(process.env.MAX_SETTLEMENT_ATTEMPTS || '5');
        const pendingJobs = await this.prisma.settlementJob.findMany({
            where: {
                status: { in: ['PENDING', 'FAILED'] },
                attempts: { lt: MAX_ATTEMPTS },
            },
            take: 50,
            orderBy: { createdAt: 'asc' },
        });
        for (const job of pendingJobs) {
            await this.settlementQueue.add('execute-settlement', { settlementJobId: job.id }, {
                jobId: `settle-${job.id}`,
                removeOnComplete: true,
            });
        }
        if (pendingJobs.length > 0) {
            this.logger.log(`Enqueued ${pendingJobs.length} settlement jobs`);
        }
    }
};
exports.SettlementWatcherService = SettlementWatcherService;
__decorate([
    (0, schedule_1.Cron)('*/15 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettlementWatcherService.prototype, "enqueuePendingSettlements", null);
exports.SettlementWatcherService = SettlementWatcherService = SettlementWatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('settlement')),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        bullmq_2.Queue])
], SettlementWatcherService);
//# sourceMappingURL=settlement-watcher.service.js.map