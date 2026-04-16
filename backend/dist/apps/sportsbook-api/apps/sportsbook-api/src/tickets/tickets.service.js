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
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const odds_gateway_1 = require("../websocket/odds/odds.gateway");
let TicketsService = class TicketsService {
    prisma;
    wsGateway;
    constructor(prisma, wsGateway) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
    }
    async findByUser(userId) {
        return this.prisma.ticket.findMany({
            where: { userId },
            include: {
                quote: {
                    include: {
                        selection: {
                            include: {
                                market: {
                                    include: { event: { include: { match: true } } },
                                },
                            },
                        },
                    },
                },
                settlementJob: true,
            },
            orderBy: { createdAt: 'desc' },
        });
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
                                    include: { event: { include: { match: true } } },
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
    async notifyTicketUpdate(ticketId, userId, status) {
        this.wsGateway.broadcastTicketUpdate({ ticketId, userId, status });
        return { ok: true };
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        odds_gateway_1.OddsGateway])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map