/**
 * @module PrismaService
 * @description Servicio compartido de acceso a base de datos PostgreSQL vía Prisma ORM.
 *
 * Esta es la implementación reutilizable de PrismaService que se comparte
 * entre todos los microservicios del backend (bet-execution, grading, settlement, admin).
 *
 * Extiende `PrismaClient` e implementa `OnModuleInit` para
 * establecer la conexión automáticamente al iniciar cada módulo.
 *
 * Se importa como `@sportsbook/prisma` gracias al alias configurado
 * en `tsconfig.json` del monorepo.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * Hook de ciclo de vida de NestJS.
   * Establece la conexión con la base de datos al inicializar el módulo.
   */
  async onModuleInit() {
    await this.$connect();
  }
}
