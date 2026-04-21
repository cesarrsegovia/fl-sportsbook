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
var PromotionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PromotionService = PromotionService_1 = class PromotionService {
    prisma;
    logger = new common_1.Logger(PromotionService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    isEnabled() {
        return (process.env.PROMOTIONS_ENABLED ?? 'true') !== 'false';
    }
    async applyPromotion(params) {
        if (!this.isEnabled()) {
            throw new common_1.BadRequestException('Promotions engine is disabled');
        }
        const promo = await this.prisma.promotion.findUnique({
            where: { id: params.promotionId },
            include: {
                redemptions: { where: { userId: params.userId } },
            },
        });
        if (!promo)
            throw new common_1.NotFoundException('Promotion not found');
        if (promo.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Promotion is not active');
        }
        const now = new Date();
        if (now < promo.startsAt) {
            throw new common_1.BadRequestException('Promotion has not started yet');
        }
        if (now > promo.expiresAt) {
            throw new common_1.BadRequestException('Promotion has expired');
        }
        if (promo.redemptions.length > 0) {
            throw new common_1.BadRequestException('You have already used this promotion');
        }
        if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
            throw new common_1.BadRequestException('Promotion is fully redeemed');
        }
        if (promo.type === 'FREE_BET') {
            const freeBetAmount = Math.min(promo.freeBetAmount ?? 0, params.stake);
            return {
                promotionId: promo.id,
                type: 'FREE_BET',
                adjustedStake: params.stake - freeBetAmount,
                isFreeBet: true,
                freeBetAmount,
                boostedOdds: null,
            };
        }
        if (promo.type === 'ODDS_BOOST') {
            if (promo.selectionId !== params.selectionId) {
                throw new common_1.BadRequestException('Odds boost not applicable to this selection');
            }
            return {
                promotionId: promo.id,
                type: 'ODDS_BOOST',
                adjustedStake: params.stake,
                isFreeBet: false,
                freeBetAmount: 0,
                boostedOdds: promo.boostedOdds ?? null,
            };
        }
        throw new common_1.BadRequestException('Unknown promotion type');
    }
    async redeemPromotion(promotionId, userId, ticketId) {
        await this.prisma.$transaction([
            this.prisma.promotionRedemption.create({
                data: { promotionId, userId, ticketId },
            }),
            this.prisma.promotion.update({
                where: { id: promotionId },
                data: { usedCount: { increment: 1 } },
            }),
        ]);
        this.logger.log(`Promotion ${promotionId} redeemed by ${userId} on ticket ${ticketId}`);
    }
};
exports.PromotionService = PromotionService;
exports.PromotionService = PromotionService = PromotionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromotionService);
//# sourceMappingURL=promotion.service.js.map