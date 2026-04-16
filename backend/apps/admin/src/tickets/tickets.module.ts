import { Module } from '@nestjs/common';
import { AdminTicketsService } from './tickets.service.js';
import { AdminTicketsController } from './tickets.controller.js';

@Module({
  providers: [AdminTicketsService],
  controllers: [AdminTicketsController],
})
export class AdminTicketsModule {}
