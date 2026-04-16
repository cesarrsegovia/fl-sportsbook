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
exports.FeedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("@sportsbook/prisma");
let FeedService = class FeedService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFeedHealth() {
        const events = await this.prisma.sportsbookEvent.findMany({
            where: { status: { in: ['ACTIVE', 'SUSPENDED'] } },
            include: { match: { select: { league: true } } },
        });
        const byLeague = new Map();
        for (const ev of events) {
            const league = ev.match.league;
            if (!byLeague.has(league)) {
                byLeague.set(league, { active: 0, suspended: 0, latestFresh: null });
            }
            const entry = byLeague.get(league);
            if (ev.status === 'ACTIVE')
                entry.active++;
            if (ev.status === 'SUSPENDED')
                entry.suspended++;
            if (ev.feedFreshAt &&
                (!entry.latestFresh || ev.feedFreshAt > entry.latestFresh)) {
                entry.latestFresh = ev.feedFreshAt;
            }
        }
        const feeds = [];
        const now = Date.now();
        for (const [league, data] of byLeague) {
            const ageSeconds = data.latestFresh
                ? Math.round((now - data.latestFresh.getTime()) / 1000)
                : 9999;
            let status;
            if (ageSeconds < 90)
                status = 'FRESH';
            else if (ageSeconds < 300)
                status = 'STALE';
            else
                status = 'DEAD';
            feeds.push({
                league,
                lastSyncAt: data.latestFresh?.toISOString() ?? null,
                ageSeconds,
                status,
                activeEventCount: data.active,
                suspendedEventCount: data.suspended,
            });
        }
        return { feeds };
    }
};
exports.FeedService = FeedService;
exports.FeedService = FeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], FeedService);
//# sourceMappingURL=feed.service.js.map