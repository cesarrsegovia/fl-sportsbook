import { Module } from '@nestjs/common';
import { AlertService } from './alert.service.js';

@Module({
  providers: [AlertService],
})
export class AlertsModule {}
