import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BetExecutionService, SubmitBetDto } from './bet-execution.service';

@Controller('bets')
export class BetExecutionController {
  constructor(private readonly betExecutionService: BetExecutionService) {}

  @Post('confirm')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  submitBet(@Body() dto: SubmitBetDto) {
    return this.betExecutionService.submitBet(dto);
  }
}
