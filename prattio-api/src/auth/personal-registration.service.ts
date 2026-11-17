import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import { personalProfiles, users } from '../database/schema.js';
import { EmailVerificationService } from '../email-verification/email-verification.service.js';
import { RegisterPersonalDto } from './dto/register-personal.dto.js';

@Injectable()
export class PersonalRegistrationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async register(data: RegisterPersonalDto): Promise<{ message: string }> {
    this.emailVerification.ensureConfigured();
    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

    let userId: string;
    try {
      userId = await this.database.db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({
          name: data.name,
          email: data.email,
          passwordHash,
          role: data.role,
        }).returning({ id: users.id });
        await tx.insert(personalProfiles).values({
          userId: user.id,
          cpf: data.cpf,
          phone: data.phone,
        });
        return user.id;
      });
    } catch (error) {
      if (
        error instanceof DrizzleQueryError &&
        error.cause instanceof Error &&
        'code' in error.cause &&
        error.cause.code === '23505' &&
        'constraint_name' in error.cause &&
        error.cause.constraint_name === 'users_email_unique'
      ) {
        throw new ConflictException('E-mail já cadastrado.');
      }
      throw error;
    }

    try {
      await this.emailVerification.sendForUser(userId, data.email, data.role);
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      throw new ServiceUnavailableException(
        'Cadastro criado, mas não foi possível enviar a confirmação. Solicite o reenvio.',
      );
    }
    return { message: 'Cadastro criado. Confirme seu e-mail para entrar.' };
  }
}
