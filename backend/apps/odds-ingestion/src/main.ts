import { NestFactory } from '@nestjs/core';
import { OddsIngestionModule } from './odds-ingestion.module';

async function bootstrap() {
  const app = await NestFactory.create(OddsIngestionModule);
  await app.listen(process.env.PORT_ODDS_INGESTION ?? 3001, '0.0.0.0');
}
bootstrap();
