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
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EventsService = class EventsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(filters) {
        const where = {};
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.league || filters.sport) {
            where.match = {};
            if (filters.league)
                where.match.league = filters.league.toUpperCase();
            if (filters.sport)
                where.match.sport = filters.sport.toLowerCase();
        }
        const events = await this.prisma.sportsbookEvent.findMany({
            where,
            include: {
                match: true,
                markets: {
                    include: {
                        selections: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return events.map(this.formatEvent);
    }
    async findOne(eventId) {
        const event = await this.prisma.sportsbookEvent.findUnique({
            where: { id: eventId },
            include: {
                match: {
                    include: { odds: { orderBy: { lastUpdateAt: 'desc' }, take: 1 } },
                },
                markets: {
                    include: { selections: true },
                },
            },
        });
        if (!event)
            return null;
        return this.formatEvent(event);
    }
    formatEvent(event) {
        return {
            id: event.id,
            matchId: event.matchId,
            status: event.status,
            lockTime: event.lockTime,
            match: {
                homeTeam: event.match.homeTeam,
                awayTeam: event.match.awayTeam,
                homeLogo: event.match.homeLogo,
                awayLogo: event.match.awayLogo,
                startTime: event.match.startTime,
                league: event.match.league,
                sport: event.match.sport,
            },
            markets: event.markets.map((m) => ({
                id: m.id,
                type: m.type,
                status: m.status,
                selections: m.selections.map((s) => ({
                    id: s.id,
                    name: s.name,
                    oddsValue: s.oddsValue,
                })),
            })),
        };
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventsService);
//# sourceMappingURL=events.service.js.map