import { db, type Database } from '@/lib/db';
import { files, tags } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import type { DbClient } from './user';

export type TagRow = typeof tags.$inferSelect;
export type TagInsert = typeof tags.$inferInsert;
export type TagUpdate = Pick<PgUpdateSetSource<typeof tags>, 'name' | 'color'>;
export type TagPublicRow = Pick<TagRow, 'id' | 'createdAt' | 'updatedAt' | 'name' | 'color'>;
export type TagWithFiles = TagPublicRow & { files: { id: string }[] };

type TagFindManyConfig = NonNullable<Parameters<Database['query']['tags']['findMany']>[0]>;
export const tagColumns = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
} as const satisfies NonNullable<TagFindManyConfig['columns']>;
const tagFileRelations = {
  fileTags: { columns: { fileId: true } },
} as const satisfies NonNullable<TagFindManyConfig['with']>;

async function queryTagsWithFiles(where: TagFindManyConfig['where'], client: DbClient) {
  return client.query.tags.findMany({ columns: tagColumns, where, with: tagFileRelations });
}

function mapTagFiles(row: Awaited<ReturnType<typeof queryTagsWithFiles>>[number]): TagWithFiles {
  const { fileTags, ...tag } = row;
  return { ...tag, files: fileTags.map(({ fileId }) => ({ id: fileId })) };
}

export async function listTagsForUser(userId: string, client: DbClient = db) {
  return (await queryTagsWithFiles(eq(tags.userId, userId), client)).map(mapTagFiles);
}

export async function findTagById(id: string, client: DbClient = db) {
  return (await client.query.tags.findFirst({ columns: tagColumns, where: eq(tags.id, id) })) ?? null;
}

export async function findOwnedTagById(id: string, userId: string, client: DbClient = db) {
  const [row] = await queryTagsWithFiles(and(eq(tags.id, id), eq(tags.userId, userId)), client);
  return row ? mapTagFiles(row) : null;
}

export async function findTagByName(name: string, userId?: string, client: DbClient = db) {
  return (
    (await client.query.tags.findFirst({
      columns: tagColumns,
      where: and(eq(tags.name, name), userId ? eq(tags.userId, userId) : undefined),
    })) ?? null
  );
}

export async function findOwnedTagsByIds(ids: string[], userId: string, client: DbClient = db) {
  if (!ids.length) return [];
  return client.query.tags.findMany({
    columns: tagColumns,
    where: and(eq(tags.userId, userId), inArray(tags.id, ids)),
  });
}

export async function commonFileIdsForTags(ids: string[], userId: string, client: DbClient = db) {
  const owned = await queryTagsWithFiles(and(eq(tags.userId, userId), inArray(tags.id, ids)), client);
  if (owned.length !== ids.length) return null;
  if (!owned.length) return [];

  const byId = new Map(owned.map((tag) => [tag.id, tag.fileTags]));
  const groups = ids.map((id) => new Set((byId.get(id) ?? []).map((link) => link.fileId)));
  return [...groups[0]].filter((fileId) => groups.every((group) => group.has(fileId)));
}

export async function createTag(data: TagInsert, client: DbClient = db) {
  const rows = await client.insert(tags).values(data).returning();
  if (!rows[0]) throw new Error('Tag insert did not return a row');
  const { userId: _, ...tag } = rows[0];
  return { ...tag, files: [] } satisfies TagWithFiles;
}

export async function updateTag(id: string, data: TagUpdate, client: DbClient = db) {
  const rows = await client.update(tags).set(data).where(eq(tags.id, id)).returning();
  if (!rows[0]) return null;
  const [updated] = await queryTagsWithFiles(eq(tags.id, id), client);
  return updated ? mapTagFiles(updated) : null;
}

export async function deleteOwnedTag(id: string, userId: string, client: DbClient = db) {
  const rows = await client
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .returning({ id: tags.id });
  return rows.length > 0;
}

const tagFileSchema = createSelectSchema(files).pick({ id: true });

export const tagSchema = createSelectSchema(tags)
  .omit({ userId: true })
  .extend({
    files: z.array(tagFileSchema).optional(),
  });

export type Tag = z.infer<typeof tagSchema>;
