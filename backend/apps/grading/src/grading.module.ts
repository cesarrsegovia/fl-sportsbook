import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@sportsbook/prisma';
import { GradingService } from './grading/grading.service';
import { GradingWorker } from './grading/grading.worker';
import { ResultWatcherService } from './result/result-watcher.service';
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
    BullModule.registerQueue({ name: 'grading' }),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [GradingService, GradingWorker, ResultWatcherService],
})
export class GradingModule {}
