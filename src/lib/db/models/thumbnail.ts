import { db } from '@/lib/db';
import { files, thumbnails, users } from '@/lib/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { DbClient } from './user';

export type Thumbnail = typeof thumbnails.$inferSelect;
export type ThumbnailInsert = typeof thumbnails.$inferInsert;

export async function listThumbnails(client: DbClient = db) {
  return client.select().from(thumbnails);
}

export async function findThumbnailByFileId(fileId: string, client: DbClient = db) {
  const rows = await client.select().from(thumbnails).where(eq(thumbnails.fileId, fileId)).limit(1);
  return rows[0] ?? null;
}

export async function findPublicThumbnailByPath(path: string, client: DbClient = db) {
  const rows = await client
    .select({ thumbnail: thumbnails })
    .from(thumbnails)
    .innerJoin(files, eq(files.id, thumbnails.fileId))
    .where(and(eq(thumbnails.path, path), isNull(files.password)))
    .limit(1);
  return rows[0]?.thumbnail ?? null;
}

export async function findThumbnailWithOwnerByPath(path: string, client: DbClient = db) {
  const rows = await client
    .select({ thumbnail: thumbnails, file: files, owner: { id: users.id, role: users.role } })
    .from(thumbnails)
    .innerJoin(files, eq(files.id, thumbnails.fileId))
    .leftJoin(users, eq(users.id, files.userId))
    .where(eq(thumbnails.path, path))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row.thumbnail, file: { ...row.file, User: row.owner?.id ? row.owner : null } };
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
