/**
 * @module @sportsbook/prisma
 * @description Punto de entrada de la librería compartida de Prisma.
 * Re-exporta `PrismaModule` y `PrismaService` para acceso simplificado
 * desde cualquier microservicio del monorepo.
 */
export { PrismaModule } from './prisma.module';
export { PrismaService } from './prisma.service';
