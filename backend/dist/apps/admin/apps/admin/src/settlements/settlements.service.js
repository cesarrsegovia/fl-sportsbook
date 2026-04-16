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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSettlementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("@sportsbook/prisma");
const audit_service_js_1 = require("../audit/audit.service.js");
let AdminSettlementsService = class AdminSettlementsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async findAll(query) {
        const page = query.page || 1;
        const limit = query.limit || 50;
        const where = {};
        if (query.status)
            where.status = query.status;
        const [data, total] = await Promise.all([
            this.prisma.settlementJob.findMany({
                where,
                include: {
                    ticket: true,
                    gradingRecord: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.settlementJob.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async retrySettlement(settlementJobId, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        const job = await this.prisma.settlementJob.findUnique({
            where: { id: settlementJobId },
        });
        if (!job)
            throw new common_1.NotFoundException('Settlement job not found');
        if (!['FAILED', 'MANUAL_INTERVENTION'].includes(job.status)) {
            throw new common_1.BadRequestException(`Job is in status ${job.status}, cannot retry`);
        }
        const before = { ...job };
        const after = await this.prisma.settlementJob.update({
            where: { id: settlementJobId },
            data: {
                status: 'PENDING',
                attempts: 0,
                notes: `Manual retry by ${actor}: ${reason}`,
            },
        });
        await this.prisma.ticket.update({
            where: { id: job.ticketId },
            data: { status: 'SETTLING' },
        });
        await this.auditService.log({
            entity: 'SettlementJob',
            entityId: settlementJobId,
            action: 'MANUAL_RETRY',
            actor,
            before,
            after,
            reason,
        });
        return after;
    }
    async getStats() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [pending, failed, manualIntervention, confirmedToday, totalPaidToday] = await Promise.all([
            this.prisma.settlementJob.count({ where: { status: 'PENDING' } }),
            this.prisma.settlementJob.count({ where: { status: 'FAILED' } }),
            this.prisma.settlementJob.count({
                where: { status: 'MANUAL_INTERVENTION' },
            }),
            this.prisma.settlementJob.count({
                where: { status: 'CONFIRMED', settledAt: { gte: todayStart } },
            }),
            this.prisma.settlementJob.aggregate({
                where: { status: 'CONFIRMED', settledAt: { gte: todayStart } },
                _sum: { amount: true },
            }),
        ]);
        return {
            pending,
            failed,
            manualIntervention,
            confirmedToday,
            totalPaidTodayUsd: totalPaidToday._sum.amount || 0,
        };
    }
};
exports.AdminSettlementsService = AdminSettlementsService;
exports.AdminSettlementsService = AdminSettlementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_service_js_1.AuditService])
], AdminSettlementsService);
//# sourceMappingURL=settlements.service.js.map