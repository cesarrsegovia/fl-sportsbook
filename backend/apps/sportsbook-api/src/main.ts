import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Punto de entrada principal del microservicio Sportsbook API.
 *
 * Inicializa la aplicación NestJS con CORS habilitado y escucha
 * en el puerto configurado (por defecto: 3000) en todas las interfaces.
 *
 * @async
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
