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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTicketsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("@sportsbook/prisma");
const audit_service_js_1 = require("../audit/audit.service.js");
const crypto = __importStar(require("crypto"));
function outcomeToTicketStatus(outcome) {
    switch (outcome) {
        case 'WIN':
            return 'WON';
        case 'LOSS':
            return 'LOST';
        case 'VOID':
            return 'VOID';
        case 'REFUND':
            return 'REFUNDED';
    }
}
let AdminTicketsService = class AdminTicketsService {
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
        if (query.userId)
            where.userId = query.userId;
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom)
                where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo)
                where.createdAt.lte = new Date(query.dateTo + 'T23:59:59Z');
        }
        if (query.league) {
            where.quote = {
                selection: {
                    market: {
                        event: {
                            match: { league: query.league },
                        },
                    },
                },
            };
        }
        const [data, total] = await Promise.all([
            this.prisma.ticket.findMany({
                where,
                include: {
                    quote: {
                        include: {
                            selection: {
                                include: {
                                    market: {
                                        include: {
                                            event: { include: { match: true } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    gradingRecord: true,
                    settlementJob: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.ticket.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async findOne(ticketId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                quote: {
                    include: {
                        selection: {
                            include: {
                                market: {
                                    include: {
                                        event: { include: { match: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                gradingRecord: true,
                settlementJob: true,
            },
        });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        return ticket;
    }
    async manualGrade(ticketId, outcome, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { gradingRecord: true, quote: true },
        });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (ticket.status !== 'MANUAL_REVIEW') {
            throw new common_1.BadRequestException(`Ticket ${ticketId} is in status ${ticket.status}, not MANUAL_REVIEW`);
        }
        if (ticket.gradingRecord) {
            throw new common_1.ConflictException('Ticket already has a grading record');
        }
        const gradingRecord = await this.prisma.gradingRecord.create({
            data: {
                ticketId,
                outcome,
                resultSource: 'MANUAL_OPERATOR',
                gradedBy: actor,
                notes: reason,
            },
        });
        const newStatus = outcomeToTicketStatus(outcome);
        const before = { ...ticket };
        const after = await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: newStatus },
        });
        await this.auditService.log({
            entity: 'Ticket',
            entityId: ticketId,
            action: 'MANUAL_GRADE',
            actor,
            before,
            after: { ...after, gradingRecord },
            reason,
        });
        if (outcome === 'WIN' || outcome === 'REFUND') {
            const amount = outcome === 'WIN' ? ticket.quote.expectedPayout : ticket.quote.stake;
            const idempotencyKey = crypto
                .createHash('sha256')
                .update(`${ticketId}:${outcome}:${amount.toFixed(6)}`)
                .digest('hex');
            await this.prisma.settlementJob.upsert({
                where: { idempotencyKey },
                create: {
                    ticketId,
                    gradingRecordId: gradingRecord.id,
                    idempotencyKey,
                    amount,
                    toWallet: ticket.userId,
                    status: 'PENDING',
                },
                update: {},
            });
            await this.prisma.ticket.update({
                where: { id: ticketId },
                data: { status: 'SETTLING' },
            });
        }
    }
    async voidTicket(ticketId, reason, actor) {
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reason must be at least 10 characters');
        }
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { gradingRecord: true },
        });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (ticket.status !== 'CONFIRMED') {
            throw new common_1.BadRequestException(`Ticket must be in CONFIRMED status to void, currently: ${ticket.status}`);
        }
        if (ticket.gradingRecord) {
            throw new common_1.ConflictException('Ticket already has a grading record');
        }
        const before = { ...ticket };
        const after = await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'VOID' },
        });
        await this.prisma.gradingRecord.create({
            data: {
                ticketId,
                outcome: 'VOID',
                resultSource: 'MANUAL_OPERATOR',
                gradedBy: actor,
                notes: reason,
            },
        });
        await this.auditService.log({
            entity: 'Ticket',
            entityId: ticketId,
            action: 'VOID',
            actor,
            before,
            after,
            reason,
        });
        return after;
    }
};
exports.AdminTicketsService = AdminTicketsService;
exports.AdminTicketsService = AdminTicketsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_service_js_1.AuditService])
], AdminTicketsService);
//# sourceMappingURL=tickets.service.js.map