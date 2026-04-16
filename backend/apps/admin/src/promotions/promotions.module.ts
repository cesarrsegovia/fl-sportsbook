import { Module } from '@nestjs/common';
import { PrismaModule } from '@sportsbook/prisma';
import { AuditModule } from '../audit/audit.module.js';
import { AdminPromotionsController } from './promotions.controller.js';
import { AdminPromotionsService } from './promotions.service.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminPromotionsController],
  providers: [AdminPromotionsService],
  exports: [AdminPromotionsService],
})
export class AdminPromotionsModule {}
