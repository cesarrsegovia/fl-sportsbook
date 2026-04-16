import { NestFactory } from '@nestjs/core';
import { AdminModule } from './admin.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AdminModule);
  app.enableCors({
    origin: [
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      process.env.ADMIN_FRONTEND_URL,
    ].filter(Boolean) as string[],
  });

  const port = process.env.PORT_ADMIN ?? 3005;
  await app.listen(port, '0.0.0.0');
  console.log(`Admin app running on port ${port}`);
}
bootstrap();
