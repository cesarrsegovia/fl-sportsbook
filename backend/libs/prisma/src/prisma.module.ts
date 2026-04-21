/**
 * @module PrismaModule
 * @description Módulo global de Prisma compartido entre todos los microservicios.
 *
 * Registra `PrismaService` como provider global, permitiendo su inyección
 * en cualquier servicio sin necesidad de importar el módulo explícitamente.
 *
 * @example
 * ```typescript
 * // En cualquier módulo del monorepo:
 * import { PrismaModule } from '@sportsbook/prisma';
 *
 * @Module({ imports: [PrismaModule] })
 * export class MyModule {}
 * ```
 */
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
