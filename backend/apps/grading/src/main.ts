import { NestFactory } from '@nestjs/core';
import { GradingModule } from './grading.module';

async function bootstrap() {
  const app = await NestFactory.create(GradingModule);
  app.enableCors();
  await app.listen(process.env.PORT_GRADING ?? 3003);
}
bootstrap();
