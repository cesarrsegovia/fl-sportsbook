/**
 * @module AuthService
 * @description Servicio de autenticación para el panel de administración.
 *
 * Implementa un login simple basado en credenciales estáticas configuradas
 * por variables de entorno (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
 * Genera tokens JWT con claims de rol para autorización.
 *
 * **Nota de seguridad**: En producción, las credenciales deben configurarse
 * vía variables de entorno seguras. Los valores por defecto son solo para desarrollo.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; expiresAt: string }> {
    const validUser = process.env.ADMIN_USERNAME || 'admin';
    const validPass = process.env.ADMIN_PASSWORD || 'changeme';

    if (username !== validUser || password !== validPass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: username, role: 'operator' };
    const accessToken = this.jwtService.sign(payload);

    const decoded = this.jwtService.decode(accessToken);
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    return { accessToken, expiresAt };
  }
}
