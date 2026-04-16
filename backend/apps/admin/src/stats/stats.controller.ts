import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service.js';

@Controller('admin/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getStats() {
    return this.statsService.getStats();
  }
}
