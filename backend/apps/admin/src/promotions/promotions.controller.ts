import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AdminPromotionsService } from './promotions.service.js';
import type { CreatePromotionDto } from './promotions.service.js';

@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly svc: AdminPromotionsService) {}

  @Get()
  async list(@Query('status') status?: string) {
    return this.svc.list(status);
  }

  @Get(':id/redemptions')
  async redemptions(@Param('id') id: string) {
    return this.svc.getRedemptions(id);
  }

  @Post()
  async create(@Body() dto: CreatePromotionDto, @Req() req: any) {
    return this.svc.create(dto, req.user.username);
  }

  @Patch(':id/pause')
  async pause(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.svc.pause(id, body.reason, req.user.username);
  }

  @Patch(':id/activate')
  async activate(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.svc.activate(id, body.reason, req.user.username);
  }
}
