"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const axios_1 = require("@nestjs/axios");
const schedule_1 = require("@nestjs/schedule");
const prisma_1 = require("@sportsbook/prisma");
const settlement_service_1 = require("./settlement/settlement.service");
const settlement_worker_1 = require("./settlement/settlement.worker");
const settlement_watcher_service_1 = require("./settlement/settlement-watcher.service");
const health_controller_1 = require("./health.controller");
let SettlementModule = class SettlementModule {
};
exports.SettlementModule = SettlementModule;
exports.SettlementModule = SettlementModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_1.PrismaModule,
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || '127.0.0.1',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            bullmq_1.BullModule.registerQueue({ name: 'settlement' }),
            axios_1.HttpModule,
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [health_controller_1.HealthController],
        providers: [settlement_service_1.SettlementService, settlement_worker_1.SettlementWorker, settlement_watcher_service_1.SettlementWatcherService],
    })
], SettlementModule);
//# sourceMappingURL=settlement.module.js.map