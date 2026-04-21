/**
 * @module LocalhostGuard
 * @description Guard de seguridad que restringe el acceso exclusivamente
 * a peticiones originadas desde localhost (127.0.0.1 / ::1).
 * Se utiliza para proteger endpoints internos de comunicación entre microservicios.
 */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Guard que verifica que la petición proviene de localhost.
 *
 * Compara la IP del solicitante contra las variantes conocidas de localhost:
 * - `127.0.0.1` (IPv4)
 * - `::1` (IPv6)
 * - `::ffff:127.0.0.1` (IPv4 mapeado a IPv6)
 *
 * @example
 * ```typescript
 * @UseGuards(LocalhostGuard)
 * @Post('internal/broadcast-ticket')
 * broadcastTicket(@Body() body: any) { ... }
 * ```
 */
@Injectable()
export class LocalhostGuard implements CanActivate {
  /**
   * Determina si la petición actual tiene acceso al recurso protegido.
   *
   * @param context - Contexto de ejecución de la petición
   * @returns `true` si la IP es localhost, `false` en caso contrario
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
}
