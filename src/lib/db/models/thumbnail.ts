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

export async function getPublicThumbnail(path: string, client: DbClient = db) {
  const publicFiles = client.select({ id: files.id }).from(files).where(isNull(files.password));
  return (
    (await client.query.thumbnails.findFirst({
      where: and(eq(thumbnails.path, path), inArray(thumbnails.fileId, publicFiles)),
    })) ?? null
  );
}

export async function getThumbnailWithOwner(path: string, client: DbClient = db) {
  const row = await client.query.thumbnails.findFirst({
    where: eq(thumbnails.path, path),
    with: thumbnailOwnerRelations,
  });
  return row ?? null;
}
