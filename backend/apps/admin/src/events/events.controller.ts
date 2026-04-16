import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { AdminEventsService } from './events.service.js';

@Controller('admin')
export class AdminEventsController {
  constructor(private readonly eventsService: AdminEventsService) {}

  @Get('events')
  async findAll(
    @Query('status') status?: string,
    @Query('league') league?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.findAll({
      status,
      league,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Patch('events/:eventId/suspend')
  async suspendEvent(
    @Param('eventId') eventId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.eventsService.suspendEvent(
      eventId,
      body.reason,
      req.user.username,
    );
  }

  @Patch('events/:eventId/reactivate')
  async reactivateEvent(
    @Param('eventId') eventId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.eventsService.reactivateEvent(
      eventId,
      body.reason,
      req.user.username,
    );
  }

  @Patch('markets/:marketId/suspend')
  async suspendMarket(
    @Param('marketId') marketId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.eventsService.suspendMarket(
      marketId,
      body.reason,
      req.user.username,
    );
  }

  @Patch('markets/:marketId/reactivate')
  async reactivateMarket(
    @Param('marketId') marketId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.eventsService.reactivateMarket(
      marketId,
      body.reason,
      req.user.username,
    );
  }

  @Patch('markets/:marketId/odds')
  async setMarketOdds(
    @Param('marketId') marketId: string,
    @Body()
    body: {
      legs: Array<{ selectionId: string; oddsValue: number }>;
      reason: string;
    },
    @Req() req: any,
  ) {
    return this.eventsService.setMarketOdds(
      marketId,
      body.legs,
      body.reason,
      req.user.username,
    );
  }
}
