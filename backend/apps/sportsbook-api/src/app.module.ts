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
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
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
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
