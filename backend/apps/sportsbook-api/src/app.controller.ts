import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

const startTime = Date.now();

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      app: 'sportsbook-api',
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  }
}
