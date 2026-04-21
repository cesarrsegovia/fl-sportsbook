/**
 * @module PrismaService
 * @description Servicio de acceso a base de datos PostgreSQL vía Prisma ORM.
 *
 * Extiende `PrismaClient` e implementa `OnModuleInit` para establecer
 * la conexión a la base de datos automáticamente al iniciar el módulo.
 * Registrado como módulo global para ser inyectado en cualquier servicio.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
