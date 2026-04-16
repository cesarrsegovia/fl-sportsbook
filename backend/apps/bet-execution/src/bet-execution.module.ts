import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@sportsbook/prisma';
import { BetExecutionService } from './execution/bet-execution.service';
import { BetExecutionController } from './execution/bet-execution.controller';
import { ConfirmationWorker } from './workers/confirmation.worker';
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
    BullModule.registerQueue({ name: 'confirmation' }),
  ],
  controllers: [BetExecutionController, HealthController],
  providers: [BetExecutionService, ConfirmationWorker],
})
export class BetExecutionModule {}
