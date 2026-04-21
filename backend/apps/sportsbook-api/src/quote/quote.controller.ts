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

/**
 * Controlador de cotizaciones de apuestas.
 *
 * Expone el endpoint `POST /quotes` para solicitar cotizaciones
 * de apuestas simples o combinadas (parlay).
 *
 * Rate limiting: máximo 10 solicitudes por minuto por IP.
 */
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
