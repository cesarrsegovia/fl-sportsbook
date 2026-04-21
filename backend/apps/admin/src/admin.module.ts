/**
 * @module AdminModule
 * @description Módulo raíz del panel de administración del sportsbook.
 *
 * Proporciona una interfaz protegida por JWT para que los operadores gestionen:
 * - **Eventos y Mercados**: Suspender/reactivar eventos, ajustar cuotas manualmente.
 * - **Tickets**: Calificación manual, anulación de apuestas.
 * - **Liquidaciones**: Reintentar pagos fallidos, ver estadísticas de pago.
 * - **Promociones**: Crear, pausar y activar promociones (Free Bets, Odds Boosts).
 * - **Feed**: Monitoreo de salud del feed de datos por liga.
 * - **Alertas**: Detección automática de feeds obsoletos y backlogs.
 * - **Auditoría**: Registro completo de todas las acciones administrativas.
 * - **Estadísticas**: Dashboard con métricas de tickets, liquidaciones y eventos.
 *
 * Seguridad: Todas las rutas están protegidas por `JwtAuthGuard` (aplicado globalmente
 * vía `APP_GUARD`), excepto las marcadas con `@Public()`.
 */
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
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AdminModule {}
