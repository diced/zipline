import { config } from '@/lib/config';
import { db, type Database, type DbClient } from '@/lib/db';
import { files, filesToTags } from '@/lib/db/schema';
import { escapeLike } from '@/lib/db/utils';
import { sanitizeFilename } from '@/lib/fs';
import { formatRootUrl } from '@/lib/url';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { tagColumns, tagSchema } from './tag';

export type FileInsert = typeof files.$inferInsert;
export type FileUpdate = Omit<PgUpdateSetSource<typeof files>, 'id' | 'createdAt' | 'updatedAt'>;

type FileFindManyConfig = NonNullable<Parameters<Database['query']['files']['findMany']>[0]>;
type FileFindFirstConfig = NonNullable<Parameters<Database['query']['files']['findFirst']>[0]>;
type FileWith = NonNullable<FileFindManyConfig['with']>;
type FileQueryOptions = Pick<FileFindManyConfig, 'where' | 'orderBy' | 'offset' | 'limit'>;
type FileLookupOptions = Pick<FileFindFirstConfig, 'where' | 'orderBy'>;
type FileListOptions = FileQueryOptions & { password: boolean; tags?: boolean };

const fileScalarConfig = {
  columns: { userId: false, password: false },
} as const satisfies Pick<FileFindManyConfig, 'columns'>;

export const filePasswordScalarConfig = {
  ...fileScalarConfig,
  extras: {
    password: (file) => sql<boolean | null>`case when ${file.password} is null then null else true end`,
  },
} as const satisfies Pick<FileFindManyConfig, 'columns' | 'extras'>;

export const fileListRelations = {
  thumbnail: { columns: { path: true } },
  tags: { columns: tagColumns },
} as const satisfies FileWith;

const fileThumbnailRelations = {
  thumbnail: { columns: { path: true } },
} as const satisfies FileWith;

const fileOwnerRelations = {
  ...fileListRelations,
  user: { columns: { id: true, role: true } },
} as const satisfies FileWith;

const fileViewRelations = {
  ...fileListRelations,
  folder: { columns: { id: true, name: true, public: true } },
} as const satisfies FileWith;

async function queryListedFiles(options: FileQueryOptions, client: DbClient) {
  return client.query.files.findMany({
    ...filePasswordScalarConfig,
    ...options,
    with: fileListRelations,
  });
}

async function queryPublicFiles(options: FileQueryOptions, client: DbClient) {
  return client.query.files.findMany({
    ...fileScalarConfig,
    ...options,
    with: fileListRelations,
  });
}

async function queryRawFile(options: FileLookupOptions, client: DbClient) {
  return client.query.files.findFirst(options);
}

async function queryRoutedFile(options: FileLookupOptions, client: DbClient) {
  return client.query.files.findFirst({
    ...options,
    with: { user: { columns: { view: true } } },
  });
}

async function queryViewFile(options: FileLookupOptions, client: DbClient) {
  return client.query.files.findFirst({ ...options, with: fileViewRelations });
}

type ListedFileRow = Awaited<ReturnType<typeof queryListedFiles>>[number];

async function queryFile(id: string, client: DbClient) {
  const row = await client.query.files.findFirst({ where: { id }, with: fileListRelations });
  return row ?? null;
}

export type ProjectedFile = ListedFileRow;

export async function listFiles(options: FileListOptions, client: DbClient = db) {
  const { password, tags: includeTags = true, ...query } = options;
  if (!includeTags) {
    return client.query.files.findMany({
      ...(password ? filePasswordScalarConfig : fileScalarConfig),
      ...query,
      with: fileThumbnailRelations,
    });
  }
  return password ? queryListedFiles(query, client) : queryPublicFiles(query, client);
}

export async function getFile(identifier: string, client: DbClient = db) {
  const row = await client.query.files.findFirst({
    where: { OR: [{ id: identifier }, { name: identifier }] },
    with: fileOwnerRelations,
  });
  return row ?? null;
}

export function getFileByName(
  identifier: string,
  mode?: 'raw',
  client?: DbClient,
): Promise<Awaited<ReturnType<typeof queryRawFile>> | null>;
export function getFileByName(
  identifier: string,
  mode: 'route',
  client?: DbClient,
): Promise<Awaited<ReturnType<typeof queryRoutedFile>> | null>;
export function getFileByName(
  identifier: string,
  mode: 'view',
  client?: DbClient,
): Promise<Awaited<ReturnType<typeof queryViewFile>> | null>;
export async function getFileByName(
  identifier: string,
  mode: 'raw' | 'route' | 'view' = 'raw',
  client: DbClient = db,
): Promise<
  | Awaited<ReturnType<typeof queryRawFile>>
  | Awaited<ReturnType<typeof queryRoutedFile>>
  | Awaited<ReturnType<typeof queryViewFile>>
  | null
> {
  const name = sanitizeFilename(identifier);
  if (!name) return null;

  const query = mode === 'route' ? queryRoutedFile : mode === 'view' ? queryViewFile : queryRawFile;
  let file = await query({ where: { name } }, client);
  if (!file && config.files.extensionlessUrls && !name.includes('.')) {
    const escaped = escapeLike(name);
    file = await query({ where: { name: { like: `${escaped}.%` } }, orderBy: { createdAt: 'desc' } }, client);
  }

  return file ?? null;
}

export async function getFilesWithUser(ids: string[], client: DbClient = db) {
  if (!ids.length) return [];

  return client.query.files.findMany({
    columns: { id: true, name: true, userId: true },
    where: { id: { in: ids } },
    with: { user: { columns: { id: true, role: true } } },
  });
}

export async function createFile(data: FileInsert, client: DbClient = db) {
  const rows = await client.insert(files).values(data).returning({ id: files.id });
  if (!rows[0]) throw new Error('File insert did not return a row');

  const created = await queryFile(rows[0].id, client);
  if (!created) throw new Error('Inserted file could not be read back');
  return created;
}

export async function updateFile(id: string, data: FileUpdate, client: DbClient = db) {
  const [file] = await client.update(files).set(data).where(eq(files.id, id)).returning({ id: files.id });

  return file ? queryFile(file.id, client) : null;
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
  const rows = await client.delete(files).where(eq(files.id, id)).returning();
  return rows[0] ?? null;
}

export async function removeFiles(ids: string[], client: DbClient = db) {
  if (!ids.length) return 0;
  const rows = await client.delete(files).where(inArray(files.id, ids)).returning({ id: files.id });
  return rows.length;
}

async function replaceFileTags(fileId: string, tagIds: string[], client: DbClient) {
  await client.delete(filesToTags).where(eq(filesToTags.fileId, fileId));

  if (tagIds.length) {
    await client
      .insert(filesToTags)
      .values(tagIds.map((tagId) => ({ fileId, tagId })))
      .onConflictDoNothing();
  }
}

export async function updateFileAndTags(id: string, data: FileUpdate, tagIds?: string[]) {
  return db.transaction(async (tx) => {
    const [row] = await tx.update(files).set(data).where(eq(files.id, id)).returning({ id: files.id });
    if (!row) return null;

    if (tagIds) await replaceFileTags(id, tagIds, tx);

    return queryFile(row.id, tx);
  });
}

export async function isFileInFolder(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.folderId, folderId)))
    .limit(1);
  return rows.length > 0;
}

export function formatFiles<T extends Partial<File>>(rows: T[], stringifyDates = false): T[] {
  for (const file of rows) {
    if (file.password) file.password = true;

    if (stringifyDates) {
      if (file.createdAt instanceof Date) file.createdAt = file.createdAt.toISOString();
      if (file.updatedAt instanceof Date) file.updatedAt = file.updatedAt.toISOString();
      if (file.deletesAt instanceof Date) file.deletesAt = file.deletesAt.toISOString();
    }

    if (file.name) file.url = formatRootUrl(config.files.route, file.name);
  }
  return rows;
}

export const fileSchema = createSelectSchema(files, {
  createdAt: (schema) => z.union([schema, z.string()]),
  updatedAt: (schema) => z.union([schema, z.string()]),
  deletesAt: (schema) => z.union([schema, z.string()]),
  maxViews: (schema) => schema.optional(),
  password: (schema) => z.union([schema, z.boolean()]).optional(),
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
