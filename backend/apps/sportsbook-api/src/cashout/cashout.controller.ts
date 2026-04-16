import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CashoutService } from './cashout.service';

@Controller('tickets')
export class CashoutController {
  constructor(private readonly cashoutService: CashoutService) {}

  @Get(':ticketId/cashout-quote')
  async getCashoutQuote(
    @Param('ticketId') ticketId: string,
    @Query('userId') userId: string,
  ) {
    return this.cashoutService.getCashoutQuote(ticketId, userId);
  }

  @Post(':ticketId/cashout')
  async executeCashout(
    @Param('ticketId') ticketId: string,
    @Body() body: { userId: string; expectedAmount: number },
  ) {
    return this.cashoutService.executeCashout(
      ticketId,
      body.userId,
      body.expectedAmount,
    );
  }
}
