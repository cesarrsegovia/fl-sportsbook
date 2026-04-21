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
var ResultWatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultWatcherService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_1 = require("@sportsbook/prisma");
let ResultWatcherService = ResultWatcherService_1 = class ResultWatcherService {
    prisma;
    gradingQueue;
    logger = new common_1.Logger(ResultWatcherService_1.name);
    constructor(prisma, gradingQueue) {
        this.prisma = prisma;
        this.gradingQueue = gradingQueue;
    }
    async onModuleInit() {
        await this.processUngradedFinishedMatches();
    }
    async processUngradedFinishedMatches() {
        const events = await this.prisma.sportsbookEvent.findMany({
            where: {
                status: 'FINISHED',
                match: { status: 'FINISHED' },
                markets: {
                    some: {
                        selections: {
                            some: {
                                OR: [
                                    {
                                        quotes: {
                                            some: {
                                                ticket: {
                                                    status: 'CONFIRMED',
                                                    gradingRecord: null,
                                                },
                                            },
                                        },
                                    },
                                    {
                                        parlayLegs: {
                                            some: {
                                                outcome: null,
                                                ticket: { status: 'CONFIRMED' },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            select: { id: true },
        });
        for (const event of events) {
            await this.gradingQueue.add('grade-event', { eventId: event.id }, {
                jobId: `grade-${event.id}`,
                removeOnComplete: true,
            });
        }
        if (events.length > 0) {
            this.logger.log(`Enqueued ${events.length} events for grading`);
        }
    }
    async handleMatchUpdate(matchData) {
        if (matchData.status !== 'FINISHED')
            return;
        const event = await this.prisma.sportsbookEvent.findUnique({
            where: { matchId: matchData.id },
        });
        if (event) {
            await this.gradingQueue.add('grade-event', { eventId: event.id }, {
                jobId: `grade-${event.id}`,
                removeOnComplete: true,
            });
        }
    }
};
exports.ResultWatcherService = ResultWatcherService;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResultWatcherService.prototype, "processUngradedFinishedMatches", null);
exports.ResultWatcherService = ResultWatcherService = ResultWatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('grading')),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        bullmq_2.Queue])
], ResultWatcherService);
//# sourceMappingURL=result-watcher.service.js.map