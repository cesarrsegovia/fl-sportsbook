"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const cache_manager_1 = require("@nestjs/cache-manager");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const cache_manager_redis_store_1 = require("cache-manager-redis-store");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const sports_module_1 = require("./sports/sports.module");
const odds_module_1 = require("./odds/odds.module");
const websocket_module_1 = require("./websocket/websocket.module");
const quote_module_1 = require("./quote/quote.module");
const events_module_1 = require("./events/events.module");
const tickets_module_1 = require("./tickets/tickets.module");
const internal_controller_1 = require("./internal/internal.controller");
const promotion_module_1 = require("./promotions/promotion.module");
const cashout_module_1 = require("./cashout/cashout.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'quote',
                    ttl: 60000,
                    limit: 10,
                },
                {
                    name: 'general',
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            cache_manager_1.CacheModule.register({
                isGlobal: true,
                store: cache_manager_redis_store_1.redisStore,
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
                ttl: 300,
            }),
            prisma_module_1.PrismaModule,
            websocket_module_1.WebsocketModule,
            sports_module_1.SportsModule,
            odds_module_1.OddsModule,
            promotion_module_1.PromotionModule,
            quote_module_1.QuoteModule,
            events_module_1.EventsModule,
            tickets_module_1.TicketsModule,
            cashout_module_1.CashoutModule,
        ],
        controllers: [app_controller_1.AppController, internal_controller_1.InternalController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map