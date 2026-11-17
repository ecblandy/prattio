import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type SessionRequest = Request & { sessionUser: { id: string; role: 'client' | 'motoboy' | 'restaurant' } };

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Autenticação necessária.');
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(match[1]);
    } catch (error) {
      if (error instanceof Error && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
        throw new UnauthorizedException('Sessão inválida ou expirada.');
      }
      throw error;
    }
    if (
      typeof payload !== 'object' || payload === null ||
      !('sub' in payload) || typeof payload.sub !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub) ||
      !('role' in payload) || (payload.role !== 'client' && payload.role !== 'motoboy' && payload.role !== 'restaurant')
    ) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    request.sessionUser = { id: payload.sub, role: payload.role };
    return true;
  }
}
