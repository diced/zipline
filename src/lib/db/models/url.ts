import { db, type Transaction } from '@/lib/db';
import { urls, users } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, count, eq, getTableColumns, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';

const { password: _password, ...urlWithoutPasswordColumns } = getTableColumns(urls);

export type UrlSearchField = 'destination' | 'vanity' | 'code';

export type CreateUrlInput = {
  userId: string;
  destination: string;
  code: string;
  vanity?: string | null;
  maxViews?: number;
  password?: string;
  enabled?: boolean;
};

export type UpdateUrlInput = {
  vanity?: string | null;
  password?: string | null;
  maxViews?: number | null;
  destination?: string;
  enabled?: boolean;
};

export async function findUrlByIdentifier(identifier: string) {
  const rows = await db
    .select()
    .from(urls)
    .where(or(eq(urls.code, identifier), eq(urls.vanity, identifier), eq(urls.id, identifier)))
    .limit(1);

  return firstOrNull(rows);
}

export async function findUrlForViewByIdentifier(identifier: string) {
  const rows = await db
    .select({
      id: urls.id,
      password: urls.password,
      destination: urls.destination,
      maxViews: urls.maxViews,
      views: urls.views,
      enabled: urls.enabled,
    })
    .from(urls)
    .where(or(eq(urls.vanity, identifier), eq(urls.code, identifier), eq(urls.id, identifier)))
    .limit(1);

  return firstOrNull(rows);
}

export async function findUrlPasswordByIdentifier(identifier: string) {
  const rows = await db
    .select({ id: urls.id, password: urls.password })
    .from(urls)
    .where(or(eq(urls.id, identifier), eq(urls.code, identifier), eq(urls.vanity, identifier)))
    .limit(1);

  return firstOrNull(rows);
}

export async function urlVanityExists(vanity: string) {
  const rows = await db.select({ id: urls.id }).from(urls).where(eq(urls.vanity, vanity)).limit(1);
  return rows.length !== 0;
}

export async function urlCodeExists(code: string) {
  const rows = await db.select({ id: urls.id }).from(urls).where(eq(urls.code, code)).limit(1);
  return rows.length !== 0;
}

export async function urlSlugExists(slug: string) {
  const rows = await db
    .select({ id: urls.id })
    .from(urls)
    .where(or(eq(urls.code, slug), eq(urls.vanity, slug)))
    .limit(1);
  return rows.length !== 0;
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

    const countRows = await tx.select({ value: count() }).from(urls).where(eq(urls.userId, input.userId));
    const currentCount = countRows[0]?.value ?? 0;

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
  const rows = await db
    .select()
    .from(urls)
    .where(and(eq(urls.id, id), eq(urls.userId, userId)))
    .limit(1);

  return firstOrNull(rows);
}

export async function findOwnedUrlByIdWithoutPassword(id: string, userId: string) {
  const rows = await db
    .select(urlWithoutPasswordColumns)
    .from(urls)
    .where(and(eq(urls.id, id), eq(urls.userId, userId)))
    .limit(1);

  return firstOrNull(rows);
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

  return db
    .select(urlWithoutPasswordColumns)
    .from(urls)
    .where(and(eq(urls.userId, userId), sql`${searchColumn} ILIKE ${`%${escaped}%`} ESCAPE '\\'`));
}

export function listUserUrls(userId: string) {
  return db.select().from(urls).where(eq(urls.userId, userId));
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
    (url as any).password = !!url.password;
  }

  return urls;
}

export const urlSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  code: z.string(),
  vanity: z.string().nullable(),
  destination: z.string(),
  views: z.number(),
  maxViews: z.number().nullable(),
  password: z.union([z.string(), z.boolean()]).nullable(),
  enabled: z.boolean(),

  userId: z.string().nullable(),

  similarity: z.number().optional(),
});

export type Url = z.infer<typeof urlSchema>;
