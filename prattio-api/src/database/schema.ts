import { integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userRole = pgEnum('user_role', ['client', 'motoboy', 'restaurant']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRole('role').notNull().default('client'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(sql`lower(${table.email})`)],
);

export const personalProfiles = pgTable('personal_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  cpf: varchar('cpf', { length: 11 }).notNull(),
  phone: varchar('phone', { length: 11 }).notNull(),
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }).notNull().defaultNow(),
});

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('email_verification_tokens_user_unique').on(table.userId),
    uniqueIndex('email_verification_tokens_hash_unique').on(table.tokenHash),
  ],
);

export const emailChangeTokens = pgTable('email_change_tokens', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newEmail: varchar('new_email', { length: 254 }).notNull(),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex('email_change_tokens_user_unique').on(table.userId),
]);

export const restaurants = pgTable(
  'restaurants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    name: varchar('name', { length: 120 }).notNull(),
    cnpj: varchar('cnpj', { length: 14 }).notNull(),
    phone: varchar('phone', { length: 11 }).notNull(),
    postalCode: varchar('postal_code', { length: 8 }).notNull(),
    street: varchar('street', { length: 120 }).notNull(),
    number: varchar('number', { length: 20 }).notNull(),
    complement: varchar('complement', { length: 120 }),
    neighborhood: varchar('neighborhood', { length: 120 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('restaurants_user_id_unique').on(table.userId),
    uniqueIndex('restaurants_cnpj_unique').on(table.cnpj),
  ],
);

export const restaurantFeedback = pgTable('restaurant_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  kind: varchar('kind', { length: 20 }).notNull(),
  message: varchar('message', { length: 2000 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  audience: varchar('audience', { length: 20 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  message: varchar('message', { length: 4000 }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const announcementReads = pgTable('announcement_reads', {
  announcementId: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.announcementId, table.userId] })]);
