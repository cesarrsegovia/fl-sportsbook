/**
 * Controlador de gestión administrativa de liquidaciones.
 *
 * Endpoints montados bajo `/admin/settlements`:
 * - `GET /admin/settlements` — Listar trabajos de liquidación con filtros.
 * - `GET /admin/settlements/stats` — Estadísticas del pipeline de pagos.
 * - `POST /admin/settlements/:settlementJobId/retry` — Reintentar un pago fallido.
 */
import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { AdminSettlementsService } from './settlements.service.js';

@Controller('admin/settlements')
export class AdminSettlementsController {
  constructor(private readonly settlementsService: AdminSettlementsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.settlementsService.findAll({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  async getStats() {
    return this.settlementsService.getStats();
  }

  @Post(':settlementJobId/retry')
  async retrySettlement(
    @Param('settlementJobId') settlementJobId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.settlementsService.retrySettlement(
      settlementJobId,
      body.reason,
      req.user.username,
    );
  }
}
