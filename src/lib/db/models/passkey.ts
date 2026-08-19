import { db } from '@/lib/db';
import { userPasskeys } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { DbClient } from './user';

export type PasskeyRow = typeof userPasskeys.$inferSelect;
export type PasskeyInsert = typeof userPasskeys.$inferInsert;

export async function listUserPasskeys(userId: string, client: DbClient = db) {
  return client.select().from(userPasskeys).where(eq(userPasskeys.userId, userId));
}

export async function findPasskeyByCredentialId(credentialId: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(userPasskeys)
    .where(sql`${userPasskeys.reg} #>> '{webauthn,id}' = ${credentialId}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function createUserPasskey(data: PasskeyInsert, client: DbClient = db) {
  const rows = await client.insert(userPasskeys).values(data).returning();
  if (!rows[0]) throw new Error('Passkey insert did not return a row');
  return rows[0];
}

export async function updateUserPasskey(
  id: string,
  data: Partial<Omit<PasskeyInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  client: DbClient = db,
) {
  const rows = await client.update(userPasskeys).set(data).where(eq(userPasskeys.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteUserPasskey(userId: string, id: string, client: DbClient = db) {
  const rows = await client
    .delete(userPasskeys)
    .where(and(eq(userPasskeys.userId, userId), eq(userPasskeys.id, id)))
    .returning();
  return rows[0] ?? null;
}
