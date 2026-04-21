"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetExecutionModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_1 = require("@sportsbook/prisma");
const bet_execution_service_1 = require("./execution/bet-execution.service");
const bet_execution_controller_1 = require("./execution/bet-execution.controller");
const confirmation_worker_1 = require("./workers/confirmation.worker");
const health_controller_1 = require("./health.controller");
let BetExecutionModule = class BetExecutionModule {
};
exports.BetExecutionModule = BetExecutionModule;
exports.BetExecutionModule = BetExecutionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_1.PrismaModule,
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || '127.0.0.1',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            bullmq_1.BullModule.registerQueue({ name: 'confirmation' }),
        ],
        controllers: [bet_execution_controller_1.BetExecutionController, health_controller_1.HealthController],
        providers: [bet_execution_service_1.BetExecutionService, confirmation_worker_1.ConfirmationWorker],
    })
], BetExecutionModule);
//# sourceMappingURL=bet-execution.module.js.map