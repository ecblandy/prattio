import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { announcementReads, announcements } from '../database/schema.js';
import type { SessionRequest } from './session-auth.guard.js';

type SessionUser = SessionRequest['sessionUser'];

@Injectable()
export class AnnouncementsService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: SessionUser) {
    const now = new Date();
    return this.database.db.select({
      id: announcements.id,
      category: announcements.category,
      title: announcements.title,
      message: announcements.message,
      publishedAt: announcements.publishedAt,
      readAt: announcementReads.readAt,
    }).from(announcements)
      .leftJoin(announcementReads, and(eq(announcementReads.announcementId, announcements.id), eq(announcementReads.userId, user.id)))
      .where(and(
        or(eq(announcements.audience, 'all'), eq(announcements.audience, user.role)),
        lte(announcements.publishedAt, now),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
      ))
      .orderBy(desc(announcements.publishedAt), desc(announcements.id))
      .limit(50);
  }

  async markRead(user: SessionUser, id: string): Promise<{ message: string }> {
    const now = new Date();
    const [item] = await this.database.db.select({ id: announcements.id }).from(announcements).where(and(
      eq(announcements.id, id),
      or(eq(announcements.audience, 'all'), eq(announcements.audience, user.role)),
      lte(announcements.publishedAt, now),
      or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
    )).limit(1);
    if (!item) throw new NotFoundException('Aviso não encontrado.');
    await this.database.db.insert(announcementReads).values({ announcementId: id, userId: user.id }).onConflictDoNothing();
    return { message: 'Aviso marcado como lido.' };
  }
}
