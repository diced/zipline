import { config } from '@/lib/config';
import { db, type Database, type databaseSchema } from '@/lib/db';
import { files, filesToTags, folders, thumbnails, users } from '@/lib/db/schema';
import { sanitizeFilename } from '@/lib/fs';
import { formatRootUrl } from '@/lib/url';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  notInArray,
  or,
  sql,
  sum,
  type BuildQueryResult,
  type ExtractTablesWithRelations,
  type SQL,
} from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { userViewSchema, type DbClient } from './user';
import { tagColumns, tagSchema } from './tag';

export type FileRow = typeof files.$inferSelect;
export type FileInsert = typeof files.$inferInsert;
export type FileUpdate = Omit<PgUpdateSetSource<typeof files>, 'id' | 'createdAt' | 'updatedAt'>;
export type FileOwner = Pick<typeof users.$inferSelect, 'id' | 'role' | 'view'>;
export type FileFolder = Pick<typeof folders.$inferSelect, 'id' | 'name' | 'public'>;

export type FileRelationOptions = {
  thumbnail?: boolean;
  tags?: boolean;
  owner?: boolean;
  folder?: boolean;
};

export type FileListOptions = FileRelationOptions & {
  password?: boolean;
  where?: SQL;
  orderBy?: SQL | SQL[];
  offset?: number;
  limit?: number;
};

export type FileSortField =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'deletesAt'
  | 'name'
  | 'originalName'
  | 'size'
  | 'type'
  | 'views'
  | 'favorite';

const sortColumns = {
  id: files.id,
  createdAt: files.createdAt,
  updatedAt: files.updatedAt,
  deletesAt: files.deletesAt,
  name: files.name,
  originalName: files.originalName,
  size: files.size,
  type: files.type,
  views: files.views,
  favorite: files.favorite,
} as const;

export function fileOrderBy(field: FileSortField, order: 'asc' | 'desc') {
  return order === 'asc' ? asc(sortColumns[field]) : desc(sortColumns[field]);
}

type FileFindManyConfig = NonNullable<Parameters<Database['query']['files']['findMany']>[0]>;
type FileWith = NonNullable<FileFindManyConfig['with']>;

const fileScalarConfig = {
  columns: { userId: false, password: false },
} as const satisfies Pick<FileFindManyConfig, 'columns'>;

export const filePasswordScalarConfig = {
  ...fileScalarConfig,
  extras: {
    password: sql<boolean | null>`case when ${files.password} is null then null else true end`.as('password'),
  },
} as const satisfies Pick<FileFindManyConfig, 'columns' | 'extras'>;

export const defaultFileRelationConfig = {
  thumbnail: { columns: { path: true } },
  fileTags: {
    columns: {},
    with: {
      tag: {
        columns: tagColumns,
      },
    },
  },
} as const satisfies FileWith;

function fileRelationConfig(options: FileRelationOptions = { thumbnail: true, tags: true }) {
  return {
    thumbnail:
      options.thumbnail === false
        ? undefined
        : {
            columns: { path: true as const },
          },
    fileTags:
      options.tags === false
        ? undefined
        : {
            columns: {},
            with: {
              tag: {
                columns: tagColumns,
              },
            },
          },
    User: options.owner
      ? {
          columns: { id: true as const, role: true as const, view: true as const },
        }
      : undefined,
    Folder: options.folder
      ? {
          columns: { id: true as const, name: true as const, public: true as const },
        }
      : undefined,
  } as const satisfies FileWith;
}

async function queryFileRelations(options: FileListOptions, client: DbClient) {
  return client.query.files.findMany({
    where: options.where,
    orderBy: options.orderBy,
    offset: options.offset,
    limit: options.limit,
    with: fileRelationConfig(options),
  });
}

async function queryProjectedFileRelations(options: FileListOptions, client: DbClient) {
  return client.query.files.findMany({
    ...(options.password === false ? fileScalarConfig : filePasswordScalarConfig),
    where: options.where,
    orderBy: options.orderBy,
    offset: options.offset,
    limit: options.limit,
    with: fileRelationConfig(options),
  });
}

async function queryFirstFileRelations(
  options: FileRelationOptions & Pick<FileListOptions, 'where' | 'orderBy'>,
  client: DbClient,
) {
  return client.query.files.findFirst({
    where: options.where,
    orderBy: options.orderBy,
    with: fileRelationConfig(options),
  });
}

export type FileRelationResult = Awaited<ReturnType<typeof queryFileRelations>>[number];
type ListedFileRelationResult = Awaited<ReturnType<typeof queryProjectedFileRelations>>[number];
type RelationalSchema = ExtractTablesWithRelations<typeof databaseSchema>;
export type ProjectedFileRow = BuildQueryResult<
  RelationalSchema,
  RelationalSchema['files'],
  typeof fileScalarConfig
>;
export type PasswordProjectedFileRow = BuildQueryResult<
  RelationalSchema,
  RelationalSchema['files'],
  typeof filePasswordScalarConfig
>;
export type DefaultFileRelationResult = BuildQueryResult<
  RelationalSchema,
  RelationalSchema['files'],
  { with: typeof defaultFileRelationConfig }
>;
export type ProjectedFileRelationResult = BuildQueryResult<
  RelationalSchema,
  RelationalSchema['files'],
  typeof fileScalarConfig & { with: typeof defaultFileRelationConfig }
>;
export type PasswordProjectedFileRelationResult = BuildQueryResult<
  RelationalSchema,
  RelationalSchema['files'],
  typeof filePasswordScalarConfig & { with: typeof defaultFileRelationConfig }
>;
export type FileTag = DefaultFileRelationResult['fileTags'][number]['tag'];

type FlattenFileTags<TRow extends { fileTags: { tag: unknown }[] }> = Omit<TRow, 'fileTags'> & {
  tags: TRow['fileTags'][number]['tag'][];
};

export type PasswordProjectedFile = FlattenFileTags<PasswordProjectedFileRelationResult>;

type FileRelationFields = {
  thumbnail: DefaultFileRelationResult['thumbnail'];
  tags: FileTag[];
  User: FileOwner | null;
  Folder: FileFolder | null;
};

export type FileResultFor<T extends FileRelationOptions> = FileRow &
  (T extends { thumbnail: false } ? object : Pick<FileRelationFields, 'thumbnail'>) &
  (T extends { tags: false } ? object : Pick<FileRelationFields, 'tags'>) &
  (T extends { owner: true } ? Pick<FileRelationFields, 'User'> : object) &
  (T extends { folder: true } ? Pick<FileRelationFields, 'Folder'> : object);

export type FileResult = FileResultFor<{ thumbnail: true; tags: true }>;
type PartialFileResult = FileRow & Partial<FileRelationFields>;

type FileListRow<T extends FileListOptions> = T extends { password: false }
  ? ProjectedFileRow
  : PasswordProjectedFileRow;

export type ProjectedFileFor<T extends FileListOptions> = FileListRow<T> &
  (T extends { thumbnail: false } ? object : Pick<FileRelationFields, 'thumbnail'>) &
  (T extends { tags: false } ? object : Pick<FileRelationFields, 'tags'>) &
  (T extends { owner: true } ? Pick<FileRelationFields, 'User'> : object) &
  (T extends { folder: true } ? Pick<FileRelationFields, 'Folder'> : object);

type PartiallyProjectedFile = (ProjectedFileRow | PasswordProjectedFileRow) & Partial<FileRelationFields>;

type DefaultFileRelations = {
  thumbnail?: true;
  tags?: true;
  owner?: false;
  folder?: false;
};

function mapFileRelations(row: DefaultFileRelationResult, options?: DefaultFileRelations): FileResult;
function mapFileRelations<const T extends FileRelationOptions>(
  row: FileRelationResult,
  options: T,
): FileResultFor<T>;
function mapFileRelations(
  row: FileRow | FileRelationResult | DefaultFileRelationResult,
  options: FileRelationOptions = { thumbnail: true, tags: true },
): PartialFileResult {
  const { fileTags, ...file } = {
    fileTags: undefined,
    ...row,
  };
  const User = 'User' in file ? file.User : undefined;
  const result: PartialFileResult = {
    ...file,
    ...(options.tags !== false && {
      tags: fileTags?.flatMap((link) => ('tag' in link ? [link.tag] : [])) ?? [],
    }),
    ...(User && {
      User: { ...User, view: userViewSchema.parse(User.view) },
    }),
  };
  return result;
}

export function mapFileTags<
  const T extends ProjectedFileRelationResult | PasswordProjectedFileRelationResult,
>(row: T): FlattenFileTags<T> {
  const { fileTags, ...file } = row;
  return { ...file, tags: fileTags.map(({ tag }) => tag) };
}

function mapProjectedListRelations(
  row: ListedFileRelationResult,
  options: FileRelationOptions,
): PartiallyProjectedFile {
  const { fileTags, ...file } = row;
  const User = 'User' in file ? file.User : undefined;
  const result: PartiallyProjectedFile = {
    ...file,
    ...(options.tags !== false && {
      tags: fileTags?.flatMap((link) => ('tag' in link ? [link.tag] : [])) ?? [],
    }),
    ...(User && {
      User: { ...User, view: userViewSchema.parse(User.view) },
    }),
  };
  return result;
}

export function listFiles(options?: undefined, client?: DbClient): Promise<PasswordProjectedFile[]>;
export function listFiles<const T extends FileListOptions>(
  options: T,
  client?: DbClient,
): Promise<ProjectedFileFor<T>[]>;
export async function listFiles(
  options: FileListOptions = {},
  client: DbClient = db,
): Promise<PartiallyProjectedFile[]> {
  const rows = await queryProjectedFileRelations(options, client);
  return rows.map((row) => mapProjectedListRelations(row, options));
}

export async function countFiles(where?: SQL, client: DbClient = db) {
  const rows = await client.select({ value: count() }).from(files).where(where);
  return rows[0]?.value ?? 0;
}

export async function getFileUsage(userId: string, client: DbClient = db) {
  const rows = await client
    .select({ count: count(), size: sum(files.size) })
    .from(files)
    .where(eq(files.userId, userId));
  return { count: rows[0]?.count ?? 0, size: Number(rows[0]?.size ?? 0) };
}

export async function lockFileOwner(userId: string, client: DbClient) {
  return client.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
}

export function getFile(
  identifier: string,
  options?: undefined,
  client?: DbClient,
): Promise<FileResult | null>;
export function getFile<const T extends FileRelationOptions>(
  identifier: string,
  options: T,
  client?: DbClient,
): Promise<FileResultFor<T> | null>;
export async function getFile(
  identifier: string,
  options: FileRelationOptions = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const row = await queryFirstFileRelations(
    {
      where: or(eq(files.id, identifier), eq(files.name, identifier)),
      ...options,
    },
    client,
  );
  return row ? mapFileRelations(row, options) : null;
}

export function getFileById(id: string, options?: undefined, client?: DbClient): Promise<FileResult | null>;
export function getFileById<const T extends FileRelationOptions>(
  id: string,
  options: T,
  client?: DbClient,
): Promise<FileResultFor<T> | null>;
export async function getFileById(
  id: string,
  options: FileRelationOptions = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const row = await queryFirstFileRelations(
    {
      where: eq(files.id, id),
      ...options,
    },
    client,
  );
  return row ? mapFileRelations(row, options) : null;
}

export function getFileByName(
  identifier: string,
  options?: undefined,
  client?: DbClient,
): Promise<FileResult | null>;
export function getFileByName<const T extends FileRelationOptions>(
  identifier: string,
  options: T,
  client?: DbClient,
): Promise<FileResultFor<T> | null>;
export async function getFileByName(
  identifier: string,
  options: FileRelationOptions = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const name = sanitizeFilename(identifier);
  if (!name) return null;

  let row = await queryFirstFileRelations(
    {
      where: eq(files.name, name),
      ...options,
    },
    client,
  );
  if (!row && config.files.extensionlessUrls && !name.includes('.')) {
    const escaped = name.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
    row = await queryFirstFileRelations(
      {
        where: sql`${files.name} LIKE ${`${escaped}.%`} ESCAPE '\\'`,
        orderBy: desc(files.createdAt),
        ...options,
      },
      client,
    );
  }

  return row ? mapFileRelations(row, options) : null;
}

export function getFiles(
  ids: string[],
  options?: undefined,
  client?: DbClient,
): Promise<FileResultFor<{ thumbnail: false; tags: false }>[]>;
export function getFiles<const T extends FileRelationOptions>(
  ids: string[],
  options: T,
  client?: DbClient,
): Promise<FileResultFor<T>[]>;
export async function getFiles(
  ids: string[],
  options: FileRelationOptions = { thumbnail: false, tags: false },
  client: DbClient = db,
) {
  if (!ids.length) return [];
  const rows = await queryFileRelations(
    {
      where: inArray(files.id, ids),
      ...options,
    },
    client,
  );
  return rows.map((row) => mapFileRelations(row, options));
}

export async function fileNamesExist(names: string[], client: DbClient = db) {
  if (!names.length) return false;
  return !!(await client.query.files.findFirst({
    columns: { id: true },
    where: inArray(files.name, names),
  }));
}

async function insertFile(data: FileInsert, client: DbClient) {
  const rows = await client.insert(files).values(data).returning();
  if (!rows[0]) throw new Error('File insert did not return a row');
  return rows[0];
}

export function createFile(data: FileInsert, options?: undefined, client?: DbClient): Promise<FileResult>;
export function createFile<const T extends FileRelationOptions>(
  data: FileInsert,
  options: T,
  client?: DbClient,
): Promise<FileResultFor<T>>;
export async function createFile(
  data: FileInsert,
  options: FileRelationOptions = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const row = await insertFile(data, client);
  const created = await getFileById(row.id, options, client);
  if (!created) throw new Error('Inserted file could not be read back');
  return created;
}

async function updateFileRecord(id: string, data: FileUpdate, client: DbClient) {
  const rows = await client.update(files).set(data).where(eq(files.id, id)).returning();
  return rows[0] ?? null;
}

export function updateFile(
  id: string,
  data: FileUpdate,
  options?: undefined,
  client?: DbClient,
): Promise<FileResult | null>;
export function updateFile<const T extends FileRelationOptions>(
  id: string,
  data: FileUpdate,
  options: T,
  client?: DbClient,
): Promise<FileResultFor<T> | null>;
export async function updateFile(
  id: string,
  data: FileUpdate,
  options: FileRelationOptions = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const row = await updateFileRecord(id, data, client);
  return row ? getFileById(row.id, options, client) : null;
}

export async function incrementFileViews(id: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ views: sql`${files.views} + 1` })
    .where(eq(files.id, id))
    .returning({ id: files.id });
  return rows.length > 0;
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
    const row = await updateFileRecord(id, data, tx);
    if (!row) return null;
    if (tagIds) await replaceFileTags(id, tagIds, tx);
    return getFileById(row.id, { thumbnail: true, tags: true }, tx);
  });
}

export async function listThumbnailCandidates(rerun = false, client: DbClient = db) {
  const conditions: SQL[] = [sql`${files.type} LIKE 'video/%'`, sql`${files.size} > 0`];
  if (!rerun) {
    const thumbnailFileIds = client.select({ fileId: thumbnails.fileId }).from(thumbnails);
    conditions.push(notInArray(files.id, thumbnailFileIds));
  }
  return client.query.files.findMany({
    columns: { id: true },
    where: and(...conditions),
  });
}

export async function isFileInFolder(fileId: string, folderId: string, client: DbClient = db) {
  return !!(await client.query.files.findFirst({
    columns: { id: true },
    where: and(eq(files.id, fileId), eq(files.folderId, folderId)),
  }));
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
