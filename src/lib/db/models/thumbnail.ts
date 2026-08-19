import { db, type Database } from '@/lib/db';
import { files, thumbnails } from '@/lib/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { DbClient } from './user';

export type Thumbnail = typeof thumbnails.$inferSelect;
export type ThumbnailInsert = typeof thumbnails.$inferInsert;

type ThumbnailFindFirstConfig = NonNullable<Parameters<Database['query']['thumbnails']['findFirst']>[0]>;
const thumbnailOwnerRelations = {
  file: {
    columns: { userId: true },
    with: {
      User: { columns: { id: true, role: true } },
    },
  },
} as const satisfies NonNullable<ThumbnailFindFirstConfig['with']>;

export async function listThumbnails(client: DbClient = db) {
  return client.query.thumbnails.findMany();
}

export async function findThumbnailByFileId(fileId: string, client: DbClient = db) {
  return (await client.query.thumbnails.findFirst({ where: eq(thumbnails.fileId, fileId) })) ?? null;
}

export async function findPublicThumbnailByPath(path: string, client: DbClient = db) {
  const publicFiles = client.select({ id: files.id }).from(files).where(isNull(files.password));
  return (
    (await client.query.thumbnails.findFirst({
      where: and(eq(thumbnails.path, path), inArray(thumbnails.fileId, publicFiles)),
    })) ?? null
  );
}

export async function findThumbnailWithOwnerByPath(path: string, client: DbClient = db) {
  const row = await client.query.thumbnails.findFirst({
    where: eq(thumbnails.path, path),
    with: thumbnailOwnerRelations,
  });
  return row ?? null;
}

export async function createThumbnail(data: ThumbnailInsert, client: DbClient = db) {
  const rows = await client.insert(thumbnails).values(data).returning();
  if (!rows[0]) throw new Error('Thumbnail insert did not return a row');
  return rows[0];
}

export async function touchThumbnail(id: string, createdAt = new Date(), client: DbClient = db) {
  const rows = await client.update(thumbnails).set({ createdAt }).where(eq(thumbnails.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteThumbnailById(id: string, client: DbClient = db) {
  const rows = await client.delete(thumbnails).where(eq(thumbnails.id, id)).returning({ id: thumbnails.id });
  return rows.length > 0;
}

export async function deleteThumbnailsByIds(ids: string[], client: DbClient = db) {
  if (!ids.length) return 0;
  const rows = await client
    .delete(thumbnails)
    .where(inArray(thumbnails.id, ids))
    .returning({ id: thumbnails.id });
  return rows.length;
}
