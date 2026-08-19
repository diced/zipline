import { db, type Transaction } from '@/lib/db';
import { urls, users } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

const { password: _password, userId: _userId, ...publicUrlColumns } = getTableColumns(urls);

type UrlInsert = typeof urls.$inferInsert;
type CreateUrlInput = Required<Pick<UrlInsert, 'destination' | 'code'>> &
  Pick<UrlInsert, 'vanity' | 'maxViews' | 'password' | 'enabled'> & { userId: string };

type UpdateUrlInput = Omit<
  PgUpdateSetSource<typeof urls>,
  'id' | 'createdAt' | 'updatedAt' | 'views' | 'userId' | 'code'
>;

export async function createUrl(input: CreateUrlInput, maxUrls?: number | null) {
  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).for('update');

    const currentCount = await tx.$count(urls, eq(urls.userId, input.userId));

    if (maxUrls && currentCount + 1 > maxUrls) return null;

    const rows = await tx
      .insert(urls)
      .values({
        userId: input.userId,
        destination: input.destination,
        code: input.code,
        ...(input.vanity && { vanity: input.vanity }),
        ...(input.maxViews && { maxViews: input.maxViews }),
        ...(input.password && { password: input.password }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
      })
      .returning(publicUrlColumns);

    const created = rows[0];
    if (!created) throw new Error('URL insert did not return a row');
    return created;
  });
}

export async function updateUserUrl(id: string, userId: string, changes: UpdateUrlInput) {
  if (Object.keys(changes).length === 0)
    return (
      (await db.query.urls.findFirst({
        columns: { password: false, userId: false },
        where: and(eq(urls.id, id), eq(urls.userId, userId)),
      })) ?? null
    );

  const rows = await db
    .update(urls)
    .set(changes)
    .where(and(eq(urls.id, id), eq(urls.userId, userId)))
    .returning(publicUrlColumns);

  return firstOrNull(rows);
}

export async function removeUserUrl(id: string, userId: string) {
  const rows = await db
    .delete(urls)
    .where(and(eq(urls.id, id), eq(urls.userId, userId)))
    .returning(publicUrlColumns);

  return firstOrNull(rows);
}

export async function removeUrl(id: string) {
  const rows = await db.delete(urls).where(eq(urls.id, id)).returning({ id: urls.id });
  return firstOrNull(rows);
}

export async function recordUrlView(id: string) {
  const rows = await db
    .update(urls)
    .set({ views: sql`${urls.views} + 1` })
    .where(eq(urls.id, id))
    .returning({ id: urls.id });

  if (!rows[0]) throw new Error(`URL ${id} disappeared before its view could be recorded`);
}

export async function removeUrls(ids: string[], tx?: Transaction) {
  if (ids.length === 0) return 0;
  const executor = tx ?? db;
  const rows = await executor.delete(urls).where(inArray(urls.id, ids)).returning({ id: urls.id });
  return rows.length;
}

export const urlSchema = createSelectSchema(urls, { password: z.boolean() })
  .omit({ userId: true })
  .extend({ similarity: z.number().optional() });

export type Url = z.infer<typeof urlSchema>;
