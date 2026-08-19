import { db, type Transaction } from '@/lib/db';
import { urls, users } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq, getTableColumns, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

const { password: _password, ...urlWithoutPasswordColumns } = getTableColumns(urls);

export type UrlSearchField = 'destination' | 'vanity' | 'code';

type UrlInsert = typeof urls.$inferInsert;
export type CreateUrlInput = Required<Pick<UrlInsert, 'destination' | 'code'>> &
  Pick<UrlInsert, 'vanity' | 'maxViews' | 'password' | 'enabled'> & { userId: string };

export type UpdateUrlInput = Omit<
  PgUpdateSetSource<typeof urls>,
  'id' | 'createdAt' | 'updatedAt' | 'views' | 'userId' | 'code'
>;

export async function findUrlByIdentifier(identifier: string) {
  return (
    (await db.query.urls.findFirst({
      where: or(eq(urls.code, identifier), eq(urls.vanity, identifier), eq(urls.id, identifier)),
    })) ?? null
  );
}

export async function findUrlForViewByIdentifier(identifier: string) {
  return (
    (await db.query.urls.findFirst({
      columns: {
        id: true,
        password: true,
        destination: true,
        maxViews: true,
        views: true,
        enabled: true,
      },
      where: or(eq(urls.vanity, identifier), eq(urls.code, identifier), eq(urls.id, identifier)),
    })) ?? null
  );
}

export async function findUrlPasswordByIdentifier(identifier: string) {
  return (
    (await db.query.urls.findFirst({
      columns: { id: true, password: true },
      where: or(eq(urls.id, identifier), eq(urls.code, identifier), eq(urls.vanity, identifier)),
    })) ?? null
  );
}

export async function urlVanityExists(vanity: string) {
  return (await db.$count(urls, eq(urls.vanity, vanity))) > 0;
}

export async function urlCodeExists(code: string) {
  return (await db.$count(urls, eq(urls.code, code))) > 0;
}

export async function urlSlugExists(slug: string) {
  return (await db.$count(urls, or(eq(urls.code, slug), eq(urls.vanity, slug)))) > 0;
}

/**
 * Creates a URL while holding a lock on its owner so concurrent requests cannot
 * both pass the user's URL quota check.
 *
 * A null result means the requested insert would exceed `maxUrls`.
 */
export async function createUrlForUser(input: CreateUrlInput, maxUrls?: number | null) {
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
      .returning(urlWithoutPasswordColumns);

    const created = rows[0];
    if (!created) throw new Error('URL insert did not return a row');
    return created;
  });
}

export async function findOwnedUrlById(id: string, userId: string) {
  return (
    (await db.query.urls.findFirst({
      where: and(eq(urls.id, id), eq(urls.userId, userId)),
    })) ?? null
  );
}

export async function findOwnedUrlByIdWithoutPassword(id: string, userId: string) {
  return (
    (await db.query.urls.findFirst({
      columns: { password: false },
      where: and(eq(urls.id, id), eq(urls.userId, userId)),
    })) ?? null
  );
}

export async function updateOwnedUrlById(id: string, userId: string, changes: UpdateUrlInput) {
  if (Object.keys(changes).length === 0) return findOwnedUrlByIdWithoutPassword(id, userId);

  const rows = await db
    .update(urls)
    .set(changes)
    .where(and(eq(urls.id, id), eq(urls.userId, userId)))
    .returning(urlWithoutPasswordColumns);

  return firstOrNull(rows);
}

export async function deleteOwnedUrlById(id: string, userId: string) {
  const rows = await db
    .delete(urls)
    .where(and(eq(urls.id, id), eq(urls.userId, userId)))
    .returning(urlWithoutPasswordColumns);

  return firstOrNull(rows);
}

export async function deleteUrlById(id: string) {
  const rows = await db.delete(urls).where(eq(urls.id, id)).returning({ id: urls.id });
  return firstOrNull(rows);
}

export async function incrementUrlViews(id: string) {
  const rows = await db
    .update(urls)
    .set({ views: sql`${urls.views} + 1` })
    .where(eq(urls.id, id))
    .returning({ id: urls.id });

  if (!rows[0]) throw new Error(`URL ${id} disappeared before its view could be recorded`);
}

export async function searchUserUrls(userId: string, searchField: UrlSearchField, searchQuery: string) {
  const searchColumn = {
    destination: urls.destination,
    vanity: urls.vanity,
    code: urls.code,
  }[searchField];
  const escaped = searchQuery.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');

  return db.query.urls.findMany({
    columns: { password: false },
    where: and(eq(urls.userId, userId), sql`${searchColumn} ILIKE ${`%${escaped}%`} ESCAPE '\\'`),
  });
}

export function listUserUrls(userId: string) {
  return db.query.urls.findMany({ where: eq(urls.userId, userId) });
}

export function listUrlsAtMaxViews() {
  return db
    .select({ id: urls.id, destination: urls.destination })
    .from(urls)
    .where(and(isNotNull(urls.maxViews), gte(urls.views, urls.maxViews)));
}

export async function deleteUrlsByIds(ids: string[], tx?: Transaction) {
  if (ids.length === 0) return 0;
  const executor = tx ?? db;
  const rows = await executor.delete(urls).where(inArray(urls.id, ids)).returning({ id: urls.id });
  return rows.length;
}

export function cleanUrlPasswords(urls: Url[]) {
  for (const url of urls) {
    url.password = !!url.password;
  }

  return urls;
}

export const urlSchema = createSelectSchema(urls, {
  password: (schema) => z.union([schema, z.boolean()]),
}).extend({ similarity: z.number().optional() });

export type Url = z.infer<typeof urlSchema>;
