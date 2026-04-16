import { Controller, Get } from '@nestjs/common';
import { FeedService } from './feed.service.js';

@Controller('admin/feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('health')
  async getFeedHealth() {
    return this.feedService.getFeedHealth();
  }
}
