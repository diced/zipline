import { db, type DbClient } from '@/lib/db';
import { userSessions } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';

export const userSessionSchema = createSelectSchema(userSessions);
export type UserSession = typeof userSessions.$inferSelect;

export async function removeSession(userId: string, sessionId: string, client: DbClient = db) {
  return client
    .delete(userSessions)
    .where(and(eq(userSessions.userId, userId), eq(userSessions.id, sessionId)))
    .returning();
}

export async function removeOtherSessions(userId: string, currentSessionId: string, client: DbClient = db) {
  return client
    .delete(userSessions)
    .where(and(eq(userSessions.userId, userId), ne(userSessions.id, currentSessionId)))
    .returning();
}
