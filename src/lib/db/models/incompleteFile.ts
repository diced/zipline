import { db } from '@/lib/db';
import { IncompleteFileStatus } from '@/lib/db/enums';
import { incompleteFiles } from '@/lib/db/schema';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { DbClient } from './user';

export { IncompleteFileStatus } from '@/lib/db/enums';
export type { IncompleteFileStatus as IncompleteFileStatusValue } from '@/lib/db/enums';

export type IncompleteFileMetadata = z.infer<typeof metadataSchema>;
export const metadataSchema = z.object({
  file: z.object({
    filename: z.string(),
    type: z.string(),
    id: z.string(),
  }),
});

export const incompleteFileSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(IncompleteFileStatus),
  chunksTotal: z.number(),
  chunksComplete: z.number(),
  userId: z.string(),
  metadata: metadataSchema,
});

export type IncompleteFile = z.infer<typeof incompleteFileSchema>;
export type IncompleteFileInsert = Omit<typeof incompleteFiles.$inferInsert, 'metadata'> & {
  metadata: IncompleteFileMetadata;
};

function parseIncomplete(row: typeof incompleteFiles.$inferSelect): IncompleteFile {
  return incompleteFileSchema.parse({ ...row, metadata: metadataSchema.parse(row.metadata) });
}

export async function createIncompleteFile(data: IncompleteFileInsert, client: DbClient = db) {
  const rows = await client.insert(incompleteFiles).values(data).returning();
  if (!rows[0]) throw new Error('Incomplete file insert did not return a row');
  return parseIncomplete(rows[0]);
}

export async function listIncompleteFilesForUser(
  userId: string,
  options: { excludeComplete?: boolean } = {},
  client: DbClient = db,
) {
  const rows = await client
    .select()
    .from(incompleteFiles)
    .where(
      and(
        eq(incompleteFiles.userId, userId),
        options.excludeComplete ? ne(incompleteFiles.status, 'COMPLETE') : undefined,
      ),
    );
  return rows.map(parseIncomplete);
}

export async function listOwnedIncompleteFiles(ids: string[], userId: string, client: DbClient = db) {
  if (!ids.length) return [];
  const rows = await client
    .select()
    .from(incompleteFiles)
    .where(and(eq(incompleteFiles.userId, userId), inArray(incompleteFiles.id, ids)));
  return rows.map(parseIncomplete);
}

export async function updateIncompleteFile(
  id: string,
  data: Partial<Pick<IncompleteFile, 'status' | 'chunksComplete' | 'chunksTotal'>>,
  client: DbClient = db,
) {
  const rows = await client.update(incompleteFiles).set(data).where(eq(incompleteFiles.id, id)).returning();
  return rows[0] ? parseIncomplete(rows[0]) : null;
}

export async function incrementIncompleteFileChunks(
  id: string,
  status: IncompleteFile['status'],
  client: DbClient = db,
) {
  const rows = await client
    .update(incompleteFiles)
    .set({ chunksComplete: sql`${incompleteFiles.chunksComplete} + 1`, status })
    .where(eq(incompleteFiles.id, id))
    .returning();
  return rows[0] ? parseIncomplete(rows[0]) : null;
}

export async function deleteIncompleteFilesByIds(ids: string[], client: DbClient = db) {
  if (!ids.length) return 0;
  const rows = await client
    .delete(incompleteFiles)
    .where(inArray(incompleteFiles.id, ids))
    .returning({ id: incompleteFiles.id });
  return rows.length;
}
