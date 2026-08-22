import { config } from '@/lib/config';
import { db, type DbClient } from '@/lib/db';
import { files } from '@/lib/db/schema';
import { formatRootUrl } from '@/lib/url';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { tagColumns, tagSchema } from './tag';

export type FileInsert = typeof files.$inferInsert;
export type FileUpdate = Partial<Omit<FileInsert, 'id' | 'createdAt' | 'updatedAt'>>;

export const fileColumns = { userId: false, password: false } as const;

export const filePasswordExtra = {
  password: (file: typeof files) => isNotNull(file.password).mapWith(Boolean).as('password'),
} as const;

export const fileRelations = {
  thumbnail: { columns: { path: true } },
  tags: { columns: tagColumns },
} as const;

const fileOwnerRelations = {
  ...fileRelations,
  user: { columns: { id: true, role: true } },
} as const;

export async function getFile(identifier: string, client: DbClient = db) {
  const row = await client.query.files.findFirst({
    columns: fileColumns,
    where: { OR: [{ id: identifier }, { name: identifier }] },
    with: fileOwnerRelations,
  });
  return row ?? null;
}

export async function getFilesWithUser(ids: string[], client: DbClient = db) {
  if (!ids.length) return [];

  return client.query.files.findMany({
    columns: { id: true, name: true, userId: true, folderId: true },
    where: { id: { in: ids } },
    with: { user: { columns: { id: true, role: true } } },
  });
}

export async function updateFiles(ids: string[], data: FileUpdate, userId?: string, client: DbClient = db) {
  if (!ids.length) return 0;

  const rows = await client
    .update(files)
    .set(data)
    .where(and(inArray(files.id, ids), userId ? eq(files.userId, userId) : undefined))
    .returning({ id: files.id });
  return rows.length;
}

export async function removeFile(id: string, client: DbClient = db) {
  const rows = await client.delete(files).where(eq(files.id, id)).returning({ id: files.id });

  return rows[0] ?? null;
}

export async function removeFiles(ids: string[], client: DbClient = db) {
  if (!ids.length) return 0;

  const rows = await client.delete(files).where(inArray(files.id, ids)).returning({ id: files.id });
  return rows.length;
}

export function formatFiles<T extends Partial<File>>(rows: T[]): T[] {
  for (const file of rows) {
    if (file.name) file.url = formatRootUrl(config.files.route, file.name);
  }
  return rows;
}

export const fileSchema = createSelectSchema(files, {
  createdAt: (schema) => z.union([schema, z.string()]),
  updatedAt: (schema) => z.union([schema, z.string()]),
  deletesAt: (schema) => z.union([schema, z.string()]),
  maxViews: (schema) => schema.optional(),
  password: z.boolean().nullable().optional(),
  anonymous: (schema) => schema.optional(),
})
  .omit({ userId: true })
  .extend({
    thumbnail: z.object({ path: z.string() }).nullable(),
    tags: z.array(tagSchema).optional(),
    url: z.string().optional(),
    similarity: z.number().optional(),
  });

export type File = z.infer<typeof fileSchema>;
