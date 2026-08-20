import { db, type Database, type DbClient } from '@/lib/db';
import { files, filesToTags, tags } from '@/lib/db/schema';
import { and, countDistinct, eq, getTableColumns, inArray } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

type TagUpdate = Pick<PgUpdateSetSource<typeof tags>, 'name' | 'color'>;

type TagFindManyConfig = NonNullable<Parameters<Database['query']['tags']['findMany']>[0]>;
export const tagColumns = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
} as const satisfies NonNullable<TagFindManyConfig['columns']>;
const { userId: _userId, ...publicTagColumns } = getTableColumns(tags);
const tagFileRelations = {
  files: { columns: { id: true } },
} as const satisfies NonNullable<TagFindManyConfig['with']>;

async function queryTagsWithFiles(where: NonNullable<TagFindManyConfig['where']>, client: DbClient) {
  return client.query.tags.findMany({ columns: tagColumns, where, with: tagFileRelations });
}

export async function listTags(userId: string, client: DbClient = db) {
  return queryTagsWithFiles({ userId }, client);
}

export async function getOwnedTag(id: string, userId: string, client: DbClient = db) {
  const [row] = await queryTagsWithFiles({ id, userId }, client);
  return row ?? null;
}

export async function getTagByName(name: string, userId?: string, client: DbClient = db) {
  const rows = await client
    .select(publicTagColumns)
    .from(tags)
    .where(and(eq(tags.name, name), userId ? eq(tags.userId, userId) : undefined))
    .limit(1);
  return rows[0] ?? null;
}

export async function listOwnedTags(ids: string[], userId: string, client: DbClient = db) {
  if (!ids.length) return [];
  return client
    .select(publicTagColumns)
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, ids)));
}

export async function getCommonFileIds(ids: string[], userId: string, client: DbClient = db) {
  if (!ids.length) return [];

  const ownedCount = await client.$count(tags, and(eq(tags.userId, userId), inArray(tags.id, ids)));
  if (ownedCount !== ids.length) return null;

  const rows = await client
    .select({ fileId: filesToTags.fileId })
    .from(filesToTags)
    .where(inArray(filesToTags.tagId, ids))
    .groupBy(filesToTags.fileId)
    .having(eq(countDistinct(filesToTags.tagId), ids.length));
  return rows.map((row) => row.fileId);
}

export async function updateTag(id: string, data: TagUpdate, client: DbClient = db) {
  const rows = await client.update(tags).set(data).where(eq(tags.id, id)).returning();
  if (!rows[0]) return null;
  const [updated] = await queryTagsWithFiles({ id }, client);
  return updated ?? null;
}

export async function removeOwnedTag(id: string, userId: string, client: DbClient = db) {
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
