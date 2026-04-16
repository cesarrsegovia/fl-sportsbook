"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const prisma_1 = require("@sportsbook/prisma");
const auth_module_js_1 = require("./auth/auth.module.js");
const jwt_auth_guard_js_1 = require("./auth/jwt-auth.guard.js");
const audit_module_js_1 = require("./audit/audit.module.js");
const audit_controller_js_1 = require("./audit/audit.controller.js");
const health_controller_js_1 = require("./health.controller.js");
const feed_module_js_1 = require("./feed/feed.module.js");
const events_module_js_1 = require("./events/events.module.js");
const tickets_module_js_1 = require("./tickets/tickets.module.js");
const settlements_module_js_1 = require("./settlements/settlements.module.js");
const stats_module_js_1 = require("./stats/stats.module.js");
const alerts_module_js_1 = require("./alerts/alerts.module.js");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_1.PrismaModule,
            schedule_1.ScheduleModule.forRoot(),
            auth_module_js_1.AuthModule,
            audit_module_js_1.AuditModule,
            feed_module_js_1.FeedModule,
            events_module_js_1.AdminEventsModule,
            tickets_module_js_1.AdminTicketsModule,
            settlements_module_js_1.AdminSettlementsModule,
            stats_module_js_1.StatsModule,
            alerts_module_js_1.AlertsModule,
        ],
        controllers: [audit_controller_js_1.AuditController, health_controller_js_1.HealthController],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_js_1.JwtAuthGuard },
        ],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map