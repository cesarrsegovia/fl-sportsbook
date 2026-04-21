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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BetExecutionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetExecutionService = exports.SubmitBetDto = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_1 = require("@sportsbook/prisma");
const axios_1 = __importDefault(require("axios"));
class SubmitBetDto {
    quoteId;
    txHash;
    userId;
}
exports.SubmitBetDto = SubmitBetDto;
let BetExecutionService = BetExecutionService_1 = class BetExecutionService {
    prisma;
    confirmationQueue;
    logger = new common_1.Logger(BetExecutionService_1.name);
    constructor(prisma, confirmationQueue) {
        this.prisma = prisma;
        this.confirmationQueue = confirmationQueue;
    }
    async submitBet(dto) {
        const { quoteId, txHash, userId } = dto;
        const quote = await this.prisma.quote.findUnique({
            where: { id: quoteId },
            include: { ticket: true, parlayLegs: true },
        });
        if (!quote)
            throw new common_1.NotFoundException('Quote not found');
        if (quote.userId !== userId)
            throw new common_1.ForbiddenException();
        if (quote.status === 'EXPIRED' || new Date() > quote.expiresAt) {
            await this.prisma.quote.update({
                where: { id: quoteId },
                data: { status: 'EXPIRED' },
            });
            throw new common_1.BadRequestException('Quote has expired');
        }
        if (quote.ticket)
            throw new common_1.ConflictException('Quote already has a ticket');
        const ticket = await this.prisma.ticket.create({
            data: {
                quoteId,
                userId,
                txHash,
                status: 'SUBMITTED',
                type: quote.type,
                promotionId: quote.promotionId,
                isFreeBet: quote.isFreeBet,
                freeBetAmount: quote.freeBetAmount,
                parlayLegs: quote.type === 'PARLAY'
                    ? {
                        create: quote.parlayLegs.map((l) => ({
                            selectionId: l.selectionId,
                            quoteId: quote.id,
                            oddsValue: l.oddsValue,
                        })),
                    }
                    : undefined,
            },
        });
        if (quote.promotionId) {
            try {
                await this.prisma.$transaction([
                    this.prisma.promotionRedemption.create({
                        data: {
                            promotionId: quote.promotionId,
                            userId,
                            ticketId: ticket.id,
                        },
                    }),
                    this.prisma.promotion.update({
                        where: { id: quote.promotionId },
                        data: { usedCount: { increment: 1 } },
                    }),
                ]);
            }
            catch (err) {
                this.logger.warn(`Promotion ${quote.promotionId} redemption failed: ${err?.message}`);
            }
        }
        await this.prisma.quote.update({
            where: { id: quoteId },
            data: { status: 'ACCEPTED' },
        });
        await this.confirmationQueue.add('confirm-tx', { ticketId: ticket.id, txHash, userId, attempt: 1 }, { delay: 3000 });
        this.notifySportsbookApi(ticket.id, userId, 'SUBMITTED');
        return ticket;
    }
    async getTicket(ticketId) {
        return this.prisma.ticket.findUnique({ where: { id: ticketId } });
    }
    notifySportsbookApi(ticketId, userId, status) {
        const apiUrl = process.env.SPORTSBOOK_API_URL || 'http://127.0.0.1:3000';
        axios_1.default
            .post(`${apiUrl}/tickets/internal/notify`, { ticketId, userId, status })
            .catch((err) => this.logger.warn(`WS notify failed: ${err.message}`));
    }
};
exports.BetExecutionService = BetExecutionService;
exports.BetExecutionService = BetExecutionService = BetExecutionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('confirmation')),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        bullmq_2.Queue])
], BetExecutionService);
//# sourceMappingURL=bet-execution.service.js.map