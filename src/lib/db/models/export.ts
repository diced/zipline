import { db } from '@/lib/db';
import { exports as exportRecords, files } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq } from 'drizzle-orm';
import z from 'zod';

export function listUserExports(userId: string) {
  return db.select().from(exportRecords).where(eq(exportRecords.userId, userId));
}

export async function findUserExport(id: string, userId: string) {
  const rows = await db
    .select()
    .from(exportRecords)
    .where(and(eq(exportRecords.id, id), eq(exportRecords.userId, userId)))
    .limit(1);

  return firstOrNull(rows);
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

export async function createUserExport(input: { userId: string; path: string; files: number; size: string }) {
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

export const exportSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  completed: z.boolean(),
  path: z.string(),
  files: z.number(),
  size: z.string(),
});

export type Export = z.infer<typeof exportSchema>;
