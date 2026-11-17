import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { users } from '../database/schema.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByEmail(email: string) {
    const [user] = await this.database.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        onboardingCompletedAt: users.onboardingCompletedAt,
      })
      .from(users)
      .where(eq(sql`lower(${users.email})`, email))
      .limit(1);

    return user;
  }

  async completeRestaurantOnboarding(userId: string): Promise<boolean> {
    const updated = await this.database.db
      .update(users)
      .set({ onboardingCompletedAt: sql`coalesce(${users.onboardingCompletedAt}, now())` })
      .where(and(eq(users.id, userId), eq(users.role, 'restaurant'), isNotNull(users.emailVerifiedAt)))
      .returning({ id: users.id });
    return updated.length > 0;
  }
}
