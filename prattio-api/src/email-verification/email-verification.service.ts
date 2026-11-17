import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { emailVerificationTokens, users } from '../database/schema.js';
import { emailChangeEmail, EmailMessage, verificationEmail } from './email-templates.js';

type UserRole = typeof users.$inferSelect.role;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  ensureConfigured(): { apiKey: string; from: string; publicUrl: URL } {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');
    const publicUrlValue = this.config.get<string>('PUBLIC_APP_URL');
    if (!apiKey || !from || !publicUrlValue) {
      throw new ServiceUnavailableException('O envio de confirmação por e-mail não está configurado.');
    }

    let publicUrl: URL;
    try {
      publicUrl = new URL(publicUrlValue);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new ServiceUnavailableException('O endereço público da aplicação é inválido.');
    }
    if (
      publicUrl.protocol !== 'https:' &&
      !(publicUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(publicUrl.hostname))
    ) {
      throw new ServiceUnavailableException('O endereço público da aplicação deve usar HTTPS.');
    }
    return { apiKey, from, publicUrl };
  }

  async sendForUser(userId: string, email: string, role: UserRole): Promise<void> {
    const { publicUrl } = this.ensureConfigured();
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.database.db.insert(emailVerificationTokens).values({ userId, tokenHash, expiresAt })
      .onConflictDoUpdate({
        target: emailVerificationTokens.userId,
        set: { tokenHash, expiresAt },
      });

    const link = new URL('/auth/confirm-email', publicUrl);
    link.hash = `token=${token}`;
    await this.sendMessage(email, verificationEmail(publicUrl, role, link));
  }

  async sendEmailChange(email: string, code: string, role: UserRole): Promise<void> {
    const { publicUrl } = this.ensureConfigured();
    await this.sendMessage(email, emailChangeEmail(publicUrl, role, code));
  }

  private async sendMessage(email: string, message: EmailMessage): Promise<void> {
    const { apiKey, from } = this.ensureConfigured();
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email],
          ...message,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      if (!(error instanceof TypeError) && !(error instanceof DOMException)) throw error;
      this.logger.error('Não foi possível conectar ao serviço de e-mail.');
      throw new ServiceUnavailableException('Não foi possível enviar o e-mail de confirmação.');
    }
    if (!response.ok) {
      this.logger.error(`O serviço de e-mail recusou o envio (HTTP ${response.status}).`);
      throw new ServiceUnavailableException('Não foi possível enviar o e-mail de confirmação.');
    }
  }

  async resend(email: string): Promise<{ message: string }> {
    this.ensureConfigured();
    const [user] = await this.database.db.select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(and(eq(sql`lower(${users.email})`, email), isNull(users.emailVerifiedAt)))
      .limit(1);
    if (user) await this.sendForUser(user.id, user.email, user.role);
    return { message: 'Se houver uma conta pendente, enviaremos um e-mail de confirmação.' };
  }

  async verify(token: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.database.db.transaction(async (tx) => {
      const [verification] = await tx.delete(emailVerificationTokens)
        .where(and(eq(emailVerificationTokens.tokenHash, tokenHash), gt(emailVerificationTokens.expiresAt, new Date())))
        .returning({ userId: emailVerificationTokens.userId });

      if (!verification) {
        throw new BadRequestException('O link de confirmação é inválido ou expirou.');
      }

      await tx.update(users).set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, verification.userId));
    });
    return { message: 'E-mail confirmado com sucesso.' };
  }
}
