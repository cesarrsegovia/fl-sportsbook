"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const axios_1 = require("@nestjs/axios");
const schedule_1 = require("@nestjs/schedule");
const prisma_1 = require("@sportsbook/prisma");
const grading_service_1 = require("./grading/grading.service");
const grading_worker_1 = require("./grading/grading.worker");
const result_watcher_service_1 = require("./result/result-watcher.service");
const health_controller_1 = require("./health.controller");
let GradingModule = class GradingModule {
};
exports.GradingModule = GradingModule;
exports.GradingModule = GradingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_1.PrismaModule,
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || '127.0.0.1',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            bullmq_1.BullModule.registerQueue({ name: 'grading' }),
            axios_1.HttpModule,
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [health_controller_1.HealthController],
        providers: [grading_service_1.GradingService, grading_worker_1.GradingWorker, result_watcher_service_1.ResultWatcherService],
    })
], GradingModule);
//# sourceMappingURL=grading.module.js.map