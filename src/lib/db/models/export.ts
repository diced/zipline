import { db } from '@/lib/db';
import { exports as exportRecords, files } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';

export function listUserExports(userId: string) {
  return db.query.exports.findMany({ where: eq(exportRecords.userId, userId) });
}

export async function findUserExport(id: string, userId: string) {
  return (
    (await db.query.exports.findFirst({
      where: and(eq(exportRecords.id, id), eq(exportRecords.userId, userId)),
    })) ?? null
  );
}

export async function deleteUserExport(id: string, userId: string) {
  const rows = await db
    .delete(exportRecords)
    .where(and(eq(exportRecords.id, id), eq(exportRecords.userId, userId)))
    .returning({ id: exportRecords.id });

  return firstOrNull(rows);
}

export function listUserExportFiles(userId: string) {
  return db.select({ name: files.name, size: files.size }).from(files).where(eq(files.userId, userId));
}

export async function createUserExport(
  input: Pick<typeof exportRecords.$inferInsert, 'userId' | 'path' | 'files' | 'size'>,
) {
  const rows = await db.insert(exportRecords).values(input).returning();
  const created = rows[0];
  if (!created) throw new Error('Export insert did not return a row');
  return created;
}

export async function completeUserExport(id: string, size: string) {
  const rows = await db
    .update(exportRecords)
    .set({ completed: true, size })
    .where(eq(exportRecords.id, id))
    .returning({ id: exportRecords.id });

  if (!rows[0]) throw new Error(`Export ${id} disappeared before it could be completed`);
}

export const exportSchema = createSelectSchema(exportRecords).omit({ userId: true });

export type Export = Omit<typeof exportRecords.$inferSelect, 'userId'>;
