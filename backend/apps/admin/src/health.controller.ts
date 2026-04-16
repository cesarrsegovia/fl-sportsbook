import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator.js';

const startTime = Date.now();

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      app: 'admin',
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  }
}
