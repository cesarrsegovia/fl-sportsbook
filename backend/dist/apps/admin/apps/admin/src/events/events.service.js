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
exports.AdminEventsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("@sportsbook/prisma");
const audit_service_js_1 = require("../audit/audit.service.js");
let AdminEventsService = class AdminEventsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async findAll(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.league)
            where.match = { league: query.league };
        const [data, total] = await Promise.all([
            this.prisma.sportsbookEvent.findMany({
                where,
                include: {
                    match: true,
                    markets: { include: { selections: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.sportsbookEvent.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async suspendEvent(eventId, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        const before = await this.prisma.sportsbookEvent.findUnique({
            where: { id: eventId },
        });
        if (!before)
            throw new common_1.NotFoundException('Event not found');
        const after = await this.prisma.sportsbookEvent.update({
            where: { id: eventId },
            data: { status: 'SUSPENDED' },
        });
        await this.prisma.market.updateMany({
            where: { eventId, status: 'ACTIVE' },
            data: { status: 'SUSPENDED' },
        });
        await this.auditService.log({
            entity: 'SportsbookEvent',
            entityId: eventId,
            action: 'SUSPEND',
            actor,
            before,
            after,
            reason,
        });
        return after;
    }
    async reactivateEvent(eventId, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        const event = await this.prisma.sportsbookEvent.findUnique({
            where: { id: eventId },
        });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        if (event.lockTime <= new Date()) {
            throw new common_1.BadRequestException('Cannot reactivate: lockTime has already passed');
        }
        const before = { ...event };
        const after = await this.prisma.sportsbookEvent.update({
            where: { id: eventId },
            data: { status: 'ACTIVE' },
        });
        await this.auditService.log({
            entity: 'SportsbookEvent',
            entityId: eventId,
            action: 'REACTIVATE',
            actor,
            before,
            after,
            reason,
        });
        return after;
    }
    async suspendMarket(marketId, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        const before = await this.prisma.market.findUnique({
            where: { id: marketId },
        });
        if (!before)
            throw new common_1.NotFoundException('Market not found');
        const after = await this.prisma.market.update({
            where: { id: marketId },
            data: { status: 'SUSPENDED' },
        });
        await this.auditService.log({
            entity: 'Market',
            entityId: marketId,
            action: 'SUSPEND',
            actor,
            before,
            after,
            reason,
        });
        return after;
    }
    async setMarketOdds(marketId, legs, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        if (!legs || legs.length === 0) {
            throw new common_1.BadRequestException('legs is required');
        }
        for (const leg of legs) {
            if (leg.oddsValue == null || leg.oddsValue <= 1) {
                throw new common_1.BadRequestException(`Invalid oddsValue for selection ${leg.selectionId}`);
            }
        }
        const market = await this.prisma.market.findUnique({
            where: { id: marketId },
            include: { selections: true },
        });
        if (!market)
            throw new common_1.NotFoundException('Market not found');
        const before = {
            status: market.status,
            selections: market.selections.map((s) => ({
                id: s.id,
                name: s.name,
                oddsValue: s.oddsValue,
            })),
        };
        for (const leg of legs) {
            const exists = market.selections.find((s) => s.id === leg.selectionId);
            if (!exists) {
                throw new common_1.BadRequestException(`Selection ${leg.selectionId} not in market ${marketId}`);
            }
            await this.prisma.selection.update({
                where: { id: leg.selectionId },
                data: { oddsValue: leg.oddsValue },
            });
        }
        const refreshed = await this.prisma.market.findUnique({
            where: { id: marketId },
            include: { selections: true },
        });
        const allHaveOdds = refreshed.selections.every((s) => s.oddsValue != null && s.oddsValue > 1);
        const newStatus = allHaveOdds && market.status === 'SUSPENDED' ? 'ACTIVE' : market.status;
        const after = await this.prisma.market.update({
            where: { id: marketId },
            data: { status: newStatus },
            include: { selections: true },
        });
        await this.auditService.log({
            entity: 'Market',
            entityId: marketId,
            action: 'SET_ODDS',
            actor,
            before,
            after: {
                status: after.status,
                selections: after.selections.map((s) => ({
                    id: s.id,
                    name: s.name,
                    oddsValue: s.oddsValue,
                })),
            },
            reason,
        });
        return after;
    }
    async reactivateMarket(marketId, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        const before = await this.prisma.market.findUnique({
            where: { id: marketId },
        });
        if (!before)
            throw new common_1.NotFoundException('Market not found');
        const after = await this.prisma.market.update({
            where: { id: marketId },
            data: { status: 'ACTIVE' },
        });
        await this.auditService.log({
            entity: 'Market',
            entityId: marketId,
            action: 'REACTIVATE',
            actor,
            before,
            after,
            reason,
        });
        return after;
    }
};
exports.AdminEventsService = AdminEventsService;
exports.AdminEventsService = AdminEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_service_js_1.AuditService])
], AdminEventsService);
//# sourceMappingURL=events.service.js.map