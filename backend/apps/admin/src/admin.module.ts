import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@sportsbook/prisma';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { AuditModule } from './audit/audit.module.js';
import { AuditController } from './audit/audit.controller.js';
import { HealthController } from './health.controller.js';
import { FeedModule } from './feed/feed.module.js';
import { AdminEventsModule } from './events/events.module.js';
import { AdminTicketsModule } from './tickets/tickets.module.js';
import { AdminSettlementsModule } from './settlements/settlements.module.js';
import { StatsModule } from './stats/stats.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { AdminPromotionsModule } from './promotions/promotions.module.js';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    AuthModule,
    AuditModule,
    FeedModule,
    AdminEventsModule,
    AdminTicketsModule,
    AdminSettlementsModule,
    StatsModule,
    AlertsModule,
    AdminPromotionsModule,
  ],
  controllers: [AuditController, HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AdminModule {}
