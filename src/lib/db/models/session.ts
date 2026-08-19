import { db } from '@/lib/db';
import { userSessions } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import type { DbClient } from './user';

export const userSessionSchema = createSelectSchema(userSessions);
export type UserSession = typeof userSessions.$inferSelect;
type NewUserSession = Pick<UserSession, 'id' | 'ua' | 'client' | 'device' | 'userId'>;

export async function createSession(data: NewUserSession, client: DbClient = db) {
  const rows = await client.insert(userSessions).values(data).returning();
  if (!rows[0]) throw new Error('User session insert did not return a row');
  return rows[0];
}

export async function replaceSessions(data: NewUserSession) {
  return db.transaction(async (tx) => {
    await tx.delete(userSessions).where(eq(userSessions.userId, data.userId));
    return createSession(data, tx);
  });
}

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

export async function listSessions(userId: string, client: DbClient = db) {
  return client.query.userSessions.findMany({ where: eq(userSessions.userId, userId) });
}
