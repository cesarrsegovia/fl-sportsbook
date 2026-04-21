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
exports.AdminPromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("@sportsbook/prisma");
const audit_service_js_1 = require("../audit/audit.service.js");
let AdminPromotionsService = class AdminPromotionsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async list(status) {
        const where = {};
        if (status)
            where.status = status;
        return this.prisma.promotion.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async getRedemptions(promotionId) {
        const promo = await this.prisma.promotion.findUnique({
            where: { id: promotionId },
        });
        if (!promo)
            throw new common_1.NotFoundException('Promotion not found');
        return this.prisma.promotionRedemption.findMany({
            where: { promotionId },
            orderBy: { redeemedAt: 'desc' },
        });
    }
    async create(dto, actor) {
        if (!dto.name || !dto.description) {
            throw new common_1.BadRequestException('name and description required');
        }
        const startsAt = new Date(dto.startsAt);
        const expiresAt = new Date(dto.expiresAt);
        if (isNaN(startsAt.getTime()) || isNaN(expiresAt.getTime())) {
            throw new common_1.BadRequestException('Invalid dates');
        }
        if (expiresAt <= startsAt) {
            throw new common_1.BadRequestException('expiresAt must be after startsAt');
        }
        if (dto.type === 'FREE_BET') {
            if (!dto.freeBetAmount || dto.freeBetAmount <= 0) {
                throw new common_1.BadRequestException('freeBetAmount > 0 required for FREE_BET');
            }
        }
        if (dto.type === 'ODDS_BOOST') {
            if (!dto.selectionId) {
                throw new common_1.BadRequestException('selectionId required for ODDS_BOOST');
            }
            if (!dto.boostedOdds || dto.boostedOdds <= 1) {
                throw new common_1.BadRequestException('boostedOdds > 1 required');
            }
        }
        const created = await this.prisma.promotion.create({
            data: {
                type: dto.type,
                code: dto.code,
                name: dto.name,
                description: dto.description,
                startsAt,
                expiresAt,
                maxUses: dto.maxUses ?? null,
                freeBetAmount: dto.freeBetAmount,
                selectionId: dto.selectionId,
                boostedOdds: dto.boostedOdds,
                originalOdds: dto.originalOdds,
                status: 'ACTIVE',
            },
        });
        await this.auditService.log({
            entity: 'Promotion',
            entityId: created.id,
            action: 'CREATE',
            actor,
            before: null,
            after: created,
            reason: 'Created via admin',
        });
        return created;
    }
    async pause(id, reason, actor) {
        const before = await this.prisma.promotion.findUnique({ where: { id } });
        if (!before)
            throw new common_1.NotFoundException('Promotion not found');
        const after = await this.prisma.promotion.update({
            where: { id },
            data: { status: 'PAUSED' },
        });
        await this.auditService.log({
            entity: 'Promotion',
            entityId: id,
            action: 'PAUSE',
            actor,
            before,
            after,
            reason: reason || 'Paused',
        });
        return after;
    }
    async activate(id, reason, actor) {
        const before = await this.prisma.promotion.findUnique({ where: { id } });
        if (!before)
            throw new common_1.NotFoundException('Promotion not found');
        if (new Date() > before.expiresAt) {
            throw new common_1.BadRequestException('Cannot activate — already expired');
        }
        const after = await this.prisma.promotion.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });
        await this.auditService.log({
            entity: 'Promotion',
            entityId: id,
            action: 'ACTIVATE',
            actor,
            before,
            after,
            reason: reason || 'Activated',
        });
        return after;
    }
};
exports.AdminPromotionsService = AdminPromotionsService;
exports.AdminPromotionsService = AdminPromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_service_js_1.AuditService])
], AdminPromotionsService);
//# sourceMappingURL=promotions.service.js.map