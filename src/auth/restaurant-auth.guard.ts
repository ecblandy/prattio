import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type RestaurantRequest = Request & { restaurantUserId: string };

@Injectable()
export class RestaurantAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RestaurantRequest>();
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Autenticação necessária.');

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(match[1]);
    } catch (error) {
      if (
        error instanceof Error &&
        ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)
      ) {
        throw new UnauthorizedException('Sessão inválida ou expirada.');
      }
      throw error;
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)
    ) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    if (!('role' in payload) || payload.role !== 'restaurant') {
      throw new ForbiddenException('Acesso disponível apenas para restaurantes.');
    }
    request.restaurantUserId = payload.sub;
    return true;
  }
}
