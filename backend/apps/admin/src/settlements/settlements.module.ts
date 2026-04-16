import { Module } from '@nestjs/common';
import { AdminSettlementsService } from './settlements.service.js';
import { AdminSettlementsController } from './settlements.controller.js';

@Module({
  providers: [AdminSettlementsService],
  controllers: [AdminSettlementsController],
})
export class AdminSettlementsModule {}
