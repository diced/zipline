import { db } from '@/lib/db';
import { incompleteFiles } from '@/lib/db/schema';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import type { DbClient } from './user';

export { IncompleteFileStatus } from '@/lib/db/enums';
export type { IncompleteFileStatus as IncompleteFileStatusValue } from '@/lib/db/enums';

export type IncompleteFileMetadata = z.infer<typeof metadataSchema>;
const metadataSchema = z.object({
  file: z.object({
    filename: z.string(),
    type: z.string(),
    id: z.string(),
  }),
});

export const incompleteFileSchema = createSelectSchema(incompleteFiles, { metadata: metadataSchema });

export type IncompleteFile = z.infer<typeof incompleteFileSchema>;
export type IncompleteFileInsert = Omit<typeof incompleteFiles.$inferInsert, 'metadata'> & {
  metadata: IncompleteFileMetadata;
};
export type IncompleteFileUpdate = Pick<
  PgUpdateSetSource<typeof incompleteFiles>,
  'status' | 'chunksComplete' | 'chunksTotal'
>;

function parseIncomplete(row: typeof incompleteFiles.$inferSelect): IncompleteFile {
  return incompleteFileSchema.parse(row);
}

export async function createIncompleteFile(data: IncompleteFileInsert, client: DbClient = db) {
  const rows = await client.insert(incompleteFiles).values(data).returning();
  if (!rows[0]) throw new Error('Incomplete file insert did not return a row');
  return parseIncomplete(rows[0]);
}

export async function listIncompleteFiles(
  userId: string,
  options: { excludeComplete?: boolean } = {},
  client: DbClient = db,
) {
  const rows = await client.query.incompleteFiles.findMany({
    where: and(
      eq(incompleteFiles.userId, userId),
      options.excludeComplete ? ne(incompleteFiles.status, 'COMPLETE') : undefined,
    ),
  });
  return rows.map(parseIncomplete);
}

export async function listOwnedIncompleteFiles(ids: string[], userId: string, client: DbClient = db) {
  if (!ids.length) return [];
  const rows = await client.query.incompleteFiles.findMany({
    where: and(eq(incompleteFiles.userId, userId), inArray(incompleteFiles.id, ids)),
  });
  return rows.map(parseIncomplete);
}

export async function updateIncompleteFile(id: string, data: IncompleteFileUpdate, client: DbClient = db) {
  const rows = await client.update(incompleteFiles).set(data).where(eq(incompleteFiles.id, id)).returning();
  return rows[0] ? parseIncomplete(rows[0]) : null;
}

export async function completeChunk(id: string, status: IncompleteFile['status'], client: DbClient = db) {
  const rows = await client
    .update(incompleteFiles)
    .set({ chunksComplete: sql`${incompleteFiles.chunksComplete} + 1`, status })
    .where(eq(incompleteFiles.id, id))
    .returning();
  return rows[0] ? parseIncomplete(rows[0]) : null;
}
