"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CashoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashoutService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
let CashoutService = CashoutService_1 = class CashoutService {
    prisma;
    logger = new common_1.Logger(CashoutService_1.name);
    CASHOUT_TTL_SECONDS = 10;
    CASHOUT_MARGIN = parseFloat(process.env.CASHOUT_MARGIN || '0.05');
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCashoutQuote(ticketId, userId) {
        const ticket = await this.loadTicketForCashout(ticketId, userId);
        const selectionId = ticket.quote.selectionId;
        if (!selectionId) {
            throw new common_1.BadRequestException('Cashout not available for this ticket');
        }
        const currentOdds = await this.getCurrentOdds(selectionId);
        if (!currentOdds) {
            throw new common_1.BadRequestException('Current odds unavailable');
        }
        const rawAmount = ticket.quote.stake *
            (ticket.quote.oddsAtQuote / currentOdds) *
            (1 - this.CASHOUT_MARGIN);
        const cap = ticket.quote.stake * 0.9;
        const finalAmount = Math.max(0, Math.min(rawAmount, cap));
        const expiresAt = new Date(Date.now() + this.CASHOUT_TTL_SECONDS * 1000);
        return {
            ticketId,
            cashoutAmount: parseFloat(finalAmount.toFixed(2)),
            currentOdds,
            oddsAtBet: ticket.quote.oddsAtQuote,
            expiresAt: expiresAt.toISOString(),
        };
    }
    async executeCashout(ticketId, userId, expectedAmount) {
        const ticket = await this.loadTicketForCashout(ticketId, userId);
        const selectionId = ticket.quote.selectionId;
        if (!selectionId) {
            throw new common_1.BadRequestException('Cashout not available for this ticket');
        }
        const currentOdds = await this.getCurrentOdds(selectionId);
        if (!currentOdds) {
            throw new common_1.BadRequestException('Current odds unavailable');
        }
        const rawAmount = ticket.quote.stake *
            (ticket.quote.oddsAtQuote / currentOdds) *
            (1 - this.CASHOUT_MARGIN);
        const cap = ticket.quote.stake * 0.9;
        const actualAmount = Math.max(0, Math.min(rawAmount, cap));
        if (expectedAmount > 0) {
            const drift = Math.abs(actualAmount - expectedAmount) / expectedAmount;
            if (drift > 0.02) {
                throw new common_1.BadRequestException(JSON.stringify({
                    code: 'CASHOUT_AMOUNT_CHANGED',
                    newAmount: parseFloat(actualAmount.toFixed(2)),
                    message: 'Cashout amount changed. Please review and resubmit.',
                }));
            }
        }
        const gradingRecord = await this.prisma.gradingRecord.create({
            data: {
                ticketId,
                outcome: 'REFUND',
                resultSource: 'CASHOUT',
                gradedBy: 'user',
                notes: `User cashout at ${actualAmount.toFixed(2)} (current odds: ${currentOdds})`,
            },
        });
        const idempotencyKey = crypto
            .createHash('sha256')
            .update(`cashout:${ticketId}:${actualAmount.toFixed(6)}`)
            .digest('hex');
        await this.prisma.settlementJob.create({
            data: {
                ticketId,
                gradingRecordId: gradingRecord.id,
                idempotencyKey,
                amount: parseFloat(actualAmount.toFixed(2)),
                toWallet: ticket.userId,
                status: 'PENDING',
            },
        });
        const updated = await this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'CASHED_OUT',
                cashedOutAt: new Date(),
                cashoutAmount: parseFloat(actualAmount.toFixed(2)),
            },
        });
        this.logger.log(`Ticket ${ticketId} cashed out for ${actualAmount.toFixed(2)}`);
        return updated;
    }
    async loadTicketForCashout(ticketId, userId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                quote: {
                    include: {
                        selection: {
                            include: { market: { include: { event: true } } },
                        },
                    },
                },
            },
        });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (ticket.userId !== userId)
            throw new common_1.ForbiddenException();
        if (ticket.status !== 'CONFIRMED') {
            throw new common_1.BadRequestException(`Cannot cashout ticket in status ${ticket.status}`);
        }
        if (ticket.quote.type === 'PARLAY') {
            throw new common_1.BadRequestException('Cashout not available for parlays in v1');
        }
        if (!ticket.quote.selection) {
            throw new common_1.BadRequestException('Ticket has no selection');
        }
        const event = ticket.quote.selection.market.event;
        if (new Date() >= new Date(event.lockTime)) {
            throw new common_1.BadRequestException('Cashout not available — event already started');
        }
        return ticket;
    }
    async getCurrentOdds(selectionId) {
        const selection = await this.prisma.selection.findUnique({
            where: { id: selectionId },
        });
        return selection?.oddsValue ?? null;
    }
};
exports.CashoutService = CashoutService;
exports.CashoutService = CashoutService = CashoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CashoutService);
//# sourceMappingURL=cashout.service.js.map