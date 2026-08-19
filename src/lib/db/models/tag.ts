import { db } from '@/lib/db';
import { filesToTags, tags } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { DbClient } from './user';

export const tagSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
  files: true,
} as const;

export const tagSelectNoFiles = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
} as const;

export type TagRow = typeof tags.$inferSelect;
export type TagInsert = typeof tags.$inferInsert;
export type TagUpdate = Partial<Pick<TagInsert, 'name' | 'color'>>;
export type TagWithFiles = TagRow & { files: { id: string }[] };

async function hydrateTags(rows: TagRow[], client: DbClient = db): Promise<TagWithFiles[]> {
  if (!rows.length) return [];
  const links = await client
    .select({ tagId: filesToTags.tagId, fileId: filesToTags.fileId })
    .from(filesToTags)
    .where(
      inArray(
        filesToTags.tagId,
        rows.map((row) => row.id),
      ),
    );
  const byTag = new Map<string, { id: string }[]>();
  for (const link of links) {
    const current = byTag.get(link.tagId) ?? [];
    current.push({ id: link.fileId });
    byTag.set(link.tagId, current);
  }
  return rows.map((row) => ({ ...row, files: byTag.get(row.id) ?? [] }));
}

export async function listTagsForUser(userId: string, client: DbClient = db) {
  const rows = await client.select().from(tags).where(eq(tags.userId, userId));
  return hydrateTags(rows, client);
}

export async function findTagById(id: string, client: DbClient = db) {
  const rows = await client.select().from(tags).where(eq(tags.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findOwnedTagById(id: string, userId: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .limit(1);
  if (!rows[0]) return null;
  return (await hydrateTags(rows, client))[0];
}

export async function findTagByName(name: string, userId?: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(tags)
    .where(and(eq(tags.name, name), userId ? eq(tags.userId, userId) : undefined))
    .limit(1);
  return rows[0] ?? null;
}

export async function findOwnedTagsByIds(ids: string[], userId: string, client: DbClient = db) {
  if (!ids.length) return [];
  return client
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, ids)));
}

export async function commonFileIdsForTags(ids: string[], userId: string, client: DbClient = db) {
  const owned = await findOwnedTagsByIds(ids, userId, client);
  if (owned.length !== ids.length) return null;
  if (!owned.length) return [];

  const links = await client
    .select({ tagId: filesToTags.tagId, fileId: filesToTags.fileId })
    .from(filesToTags)
    .where(inArray(filesToTags.tagId, ids));
  const groups = ids.map(
    (id) => new Set(links.filter((link) => link.tagId === id).map((link) => link.fileId)),
  );
  return [...groups[0]].filter((fileId) => groups.every((group) => group.has(fileId)));
}

export async function createTag(data: TagInsert, client: DbClient = db) {
  const rows = await client.insert(tags).values(data).returning();
  if (!rows[0]) throw new Error('Tag insert did not return a row');
  return { ...rows[0], files: [] } satisfies TagWithFiles;
}

export async function updateTag(id: string, data: TagUpdate, client: DbClient = db) {
  const rows = await client.update(tags).set(data).where(eq(tags.id, id)).returning();
  if (!rows[0]) return null;
  return (await hydrateTags(rows, client))[0];
}

export async function deleteOwnedTag(id: string, userId: string, client: DbClient = db) {
  const rows = await client
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .returning({ id: tags.id });
  return rows.length > 0;
}

export const tagSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  color: z.string(),
  files: z.array(z.object({ id: z.string() })).optional(),
});

export type Tag = z.infer<typeof tagSchema>;
