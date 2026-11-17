import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { allowedFrontendOrigins } from '../cors.config.js';

type SessionClaims = { sub?: unknown; role?: unknown; exp?: unknown };
type AnnouncementSocket = Socket & { data: { userId: string; expiresAt: number } };

@WebSocketGateway({
  transports: ['websocket'],
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    callback(null, typeof origin === 'string' && allowedFrontendOrigins().includes(origin));
  },
})
export class AnnouncementsGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(AnnouncementsGateway.name);
  private server!: Server;

  constructor(private readonly jwt: JwtService) {}

  afterInit(server: Server): void {
    this.server = server;
    server.use((socket, next) => {
      void this.authenticate(socket).then(() => next()).catch((error: unknown) => {
        if (!(error instanceof Error) ||
            !['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
          this.logger.warn('Conexão de avisos recusada por autenticação inválida.');
        }
        next(new Error('Sessão inválida ou expirada.'));
      });
    });
  }

  private async authenticate(socket: Socket): Promise<void> {
    const token: unknown = socket.handshake.auth.token;
    if (typeof token !== 'string' || !token) throw new Error('Token ausente.');
    const claims = await this.jwt.verifyAsync<SessionClaims>(token);
    if (
      typeof claims.sub !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sub) ||
      (claims.role !== 'client' && claims.role !== 'motoboy' && claims.role !== 'restaurant') ||
      typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()
    ) {
      throw new Error('Dados da sessão inválidos.');
    }
    socket.data = { userId: claims.sub, expiresAt: claims.exp * 1000 };
  }

  handleConnection(socket: AnnouncementSocket): void {
    const delay = Math.min(socket.data.expiresAt - Date.now(), 2_147_483_647);
    if (delay <= 0) {
      socket.disconnect(true);
      return;
    }
    void socket.join(`user:${socket.data.userId}`);
    const timeout = setTimeout(() => socket.disconnect(true), delay);
    socket.once('disconnect', () => clearTimeout(timeout));
  }

  announceRead(userId: string, announcementId: string): void {
    this.server.to(`user:${userId}`).emit('announcement:read', { id: announcementId });
  }
}
