import { db, type Transaction } from '@/lib/db';
import { userSessions } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import type { DbClient, UserSession } from './user';

export type NewUserSession = Pick<UserSession, 'id' | 'ua' | 'client' | 'device' | 'userId'>;

export async function createUserSession(data: NewUserSession, client: DbClient = db) {
  const rows = await client.insert(userSessions).values(data).returning();
  if (!rows[0]) throw new Error('User session insert did not return a row');
  return rows[0];
}

export async function replaceUserSessions(data: NewUserSession) {
  return db.transaction(async (tx: Transaction) => {
    await tx.delete(userSessions).where(eq(userSessions.userId, data.userId));
    return createUserSession(data, tx);
  });
}

export async function deleteUserSession(userId: string, sessionId: string, client: DbClient = db) {
  return client
    .delete(userSessions)
    .where(and(eq(userSessions.userId, userId), eq(userSessions.id, sessionId)))
    .returning();
}

export async function deleteOtherUserSessions(
  userId: string,
  currentSessionId: string,
  client: DbClient = db,
) {
  return client
    .delete(userSessions)
    .where(and(eq(userSessions.userId, userId), ne(userSessions.id, currentSessionId)))
    .returning();
}

export async function listUserSessions(userId: string, client: DbClient = db) {
  return client.select().from(userSessions).where(eq(userSessions.userId, userId));
}
