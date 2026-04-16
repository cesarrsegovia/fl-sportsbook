import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { AdminTicketsService } from './tickets.service.js';

@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly ticketsService: AdminTicketsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('league') league?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.findAll({
      status,
      userId,
      league,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':ticketId')
  async findOne(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findOne(ticketId);
  }

  @Patch(':ticketId/grade')
  async manualGrade(
    @Param('ticketId') ticketId: string,
    @Body() body: { outcome: 'WIN' | 'LOSS' | 'VOID' | 'REFUND'; reason: string },
    @Req() req: any,
  ) {
    await this.ticketsService.manualGrade(
      ticketId,
      body.outcome,
      body.reason,
      req.user.username,
    );
    return { success: true };
  }

  @Patch(':ticketId/void')
  async voidTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.ticketsService.voidTicket(
      ticketId,
      body.reason,
      req.user.username,
    );
  }
}
