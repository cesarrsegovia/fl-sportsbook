import { Controller, Get } from '@nestjs/common';

const startTime = Date.now();

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      app: 'odds-ingestion',
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  }
}
