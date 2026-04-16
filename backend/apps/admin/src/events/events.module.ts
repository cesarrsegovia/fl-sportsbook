import { Module } from '@nestjs/common';
import { AdminEventsService } from './events.service.js';
import { AdminEventsController } from './events.controller.js';

@Module({
  providers: [AdminEventsService],
  controllers: [AdminEventsController],
})
export class AdminEventsModule {}
