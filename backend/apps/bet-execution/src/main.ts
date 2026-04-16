import { NestFactory } from '@nestjs/core';
import { BetExecutionModule } from './bet-execution.module';

async function bootstrap() {
  const app = await NestFactory.create(BetExecutionModule);
  app.enableCors();
  await app.listen(process.env.PORT_BET_EXECUTION ?? 3002, '0.0.0.0');
}
bootstrap();
