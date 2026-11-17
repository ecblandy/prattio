import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import { restaurants, users } from '../database/schema.js';
import { EmailVerificationService } from '../email-verification/email-verification.service.js';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto.js';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async register(data: RegisterRestaurantDto): Promise<{ message: string }> {
    this.emailVerification.ensureConfigured();
    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

    let userId: string;
    try {
      userId = await this.database.db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({
          name: data.responsibleName,
          email: data.email,
          passwordHash,
          role: 'restaurant',
        }).returning({ id: users.id });

        await tx.insert(restaurants).values({
          userId: user.id,
          name: data.restaurantName,
          cnpj: data.cnpj,
          phone: data.phone,
          postalCode: data.postalCode,
          street: data.street,
          number: data.number,
          complement: data.complement || null,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
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
        (error.cause.constraint_name === 'users_email_unique' ||
          error.cause.constraint_name === 'restaurants_cnpj_unique')
      ) {
        throw new ConflictException('E-mail ou CNPJ já cadastrado.');
      }
      throw error;
    }

    try {
      await this.emailVerification.sendForUser(userId, data.email, 'restaurant');
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      throw new ServiceUnavailableException(
        'Cadastro criado, mas não foi possível enviar a confirmação. Solicite o reenvio.',
      );
    }

    return { message: 'Cadastro criado. Confirme seu e-mail para entrar.' };
  }
}
