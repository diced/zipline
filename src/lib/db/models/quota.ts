import { db } from '@/lib/db';
import { userQuotas } from '@/lib/db/schema';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { DbClient } from './user';

export type UserQuotaInsert = typeof userQuotas.$inferInsert;
export type UserQuotaUpdate = Omit<
  PgUpdateSetSource<typeof userQuotas>,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
>;

export async function upsertUserQuota(
  data: UserQuotaInsert,
  client: DbClient = db,
  update?: UserQuotaUpdate,
) {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, userId: _userId, ...updates } = data;
  const rows = await client
    .insert(userQuotas)
    .values(data)
    .onConflictDoUpdate({
      target: userQuotas.userId,
      set: update ?? updates,
    })
    .returning();
  if (!rows[0]) throw new Error('User quota upsert did not return a row');
  return rows[0];
}
