/**
 * @module AppModule
 * @description Módulo raíz del microservicio Sportsbook API.
 *
 * Registra y orquesta todos los módulos de la aplicación:
 * - **ScheduleModule**: Tareas programadas (crons de sincronización).
 * - **ThrottlerModule**: Rate limiting (10 req/min para cotizaciones, 100 req/min general).
 * - **CacheModule**: Caché global con Redis para reducir carga de base de datos.
 * - **PrismaModule**: Acceso a base de datos PostgreSQL vía Prisma ORM.
 * - **WebsocketModule**: Comunicación en tiempo real con clientes vía Socket.IO.
 * - **SportsModule**: Sincronización de datos deportivos desde ESPN.
 * - **OddsModule**: Gestión de cuotas de apuestas.
 * - **PromotionModule**: Motor de promociones (apuestas gratis, odds boost).
 * - **QuoteModule**: Generación y validación de cotizaciones.
 * - **EventsModule**: Consulta de eventos de apuestas.
 * - **TicketsModule**: Gestión del ciclo de vida de tickets.
 * - **CashoutModule**: Funcionalidad de retiro anticipado (cashout).
 */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SportsModule } from './sports/sports.module';
import { OddsModule } from './odds/odds.module';
import { WebsocketModule } from './websocket/websocket.module';
import { QuoteModule } from './quote/quote.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { InternalController } from './internal/internal.controller';
import { PromotionModule } from './promotions/promotion.module';
import { CashoutModule } from './cashout/cashout.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
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
    CacheModule.register({
      isGlobal: true,
      store: redisStore as any,
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT
        ? parseInt(process.env.REDIS_PORT, 10)
        : 6379,
      ttl: 300,
    }),
    PrismaModule,
    WebsocketModule,
    SportsModule,
    OddsModule,
    PromotionModule,
    QuoteModule,
    EventsModule,
    TicketsModule,
    CashoutModule,
  ],
  controllers: [AppController, InternalController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
