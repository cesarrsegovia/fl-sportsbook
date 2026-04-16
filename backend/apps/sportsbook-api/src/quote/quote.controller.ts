import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { QuoteService } from './quote.service';
import { RequestQuoteDto } from './dto/request-quote.dto';

@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @Throttle({ quote: { limit: 10, ttl: 60000 } })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  requestQuote(@Body() dto: RequestQuoteDto) {
    return this.quoteService.requestQuote(dto);
  }
}
