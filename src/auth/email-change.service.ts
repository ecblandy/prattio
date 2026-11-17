import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DrizzleQueryError, eq, sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { emailChangeTokens, users } from '../database/schema.js';
import { EmailVerificationService } from '../email-verification/email-verification.service.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';

@Injectable()
export class EmailChangeService {
  constructor(
    private readonly database: DatabaseService,
    private readonly email: EmailVerificationService,
    private readonly config: ConfigService,
  ) {}

  async request(userId: string, data: RequestEmailChangeDto): Promise<{ message: string }> {
    this.email.ensureConfigured();
    const [user] = await this.database.db.select({
      email: users.email, passwordHash: users.passwordHash, verifiedAt: users.emailVerifiedAt,
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.verifiedAt || !(await argon2.verify(user.passwordHash, data.password))) {
      throw new UnauthorizedException('Senha incorreta ou sessão indisponível.');
    }
    if (user.email.toLowerCase() === data.email) throw new BadRequestException('Informe um e-mail diferente do atual.');
    const [existing] = await this.database.db.select({ id: users.id }).from(users)
      .where(eq(sql`lower(${users.email})`, data.email)).limit(1);
    if (existing) throw new ConflictException('Este e-mail já está cadastrado.');
    const code = String(randomInt(0, 100_000_000)).padStart(8, '0');
    const codeHash = this.hashCode(userId, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.database.db.insert(emailChangeTokens).values({ userId, newEmail: data.email, codeHash, expiresAt })
      .onConflictDoUpdate({ target: emailChangeTokens.userId, set: { newEmail: data.email, codeHash, expiresAt, attempts: 0 } });
    await this.email.sendMessage(data.email, 'Confirme a alteração de e-mail na Prattio',
      `Seu código para confirmar o novo e-mail na Prattio é: ${code}\n\nO código é válido por 15 minutos. Se você não solicitou a alteração, ignore este e-mail.`);
    return { message: 'Enviamos um código de confirmação para o novo e-mail.' };
  }

  async confirm(userId: string, code: string): Promise<{ message: string; email: string }> {
    let confirmedEmail: string | null = null;
    try {
      await this.database.db.transaction(async (tx) => {
        const [change] = await tx.select().from(emailChangeTokens)
          .where(eq(emailChangeTokens.userId, userId)).for('update').limit(1);
        if (!change || change.expiresAt <= new Date() || change.attempts >= 5) return;
        const expected = Buffer.from(change.codeHash, 'hex');
        const actual = Buffer.from(this.hashCode(userId, code), 'hex');
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
          await tx.update(emailChangeTokens).set({ attempts: change.attempts + 1 })
            .where(eq(emailChangeTokens.userId, userId));
          return;
        }
        await tx.update(users).set({ email: change.newEmail, emailVerifiedAt: new Date() })
          .where(eq(users.id, userId));
        await tx.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));
        confirmedEmail = change.newEmail;
      });
    } catch (error) {
      if (error instanceof DrizzleQueryError && error.cause instanceof Error &&
          'code' in error.cause && error.cause.code === '23505' &&
          'constraint_name' in error.cause && error.cause.constraint_name === 'users_email_unique') {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }
      throw error;
    }
    if (!confirmedEmail) throw new BadRequestException('Código inválido, expirado ou com tentativas esgotadas. Solicite outro código.');
    return { message: 'E-mail alterado com sucesso.', email: confirmedEmail };
  }

  private hashCode(userId: string, code: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET')).update(`${userId}:${code}`).digest('hex');
  }
}
