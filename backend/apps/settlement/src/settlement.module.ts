import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@sportsbook/prisma';
import { SettlementService } from './settlement/settlement.service';
import { SettlementWorker } from './settlement/settlement.worker';
import { SettlementWatcherService } from './settlement/settlement-watcher.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({ name: 'settlement' }),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [SettlementService, SettlementWorker, SettlementWatcherService],
})
export class SettlementModule {}
