import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class LocalhostGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress;
    return (
      ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
    );
  }
}
