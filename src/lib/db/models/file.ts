import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { files, filesToTags, folders, tags, thumbnails, users } from '@/lib/db/schema';
import { sanitizeFilename } from '@/lib/fs';
import { formatRootUrl } from '@/lib/url';
import { and, asc, count, desc, eq, inArray, isNotNull, lte, or, sql, sum, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { userViewSchema, type DbClient } from './user';
import { tagSchema } from './tag';

export const fileSelect = {
  createdAt: true,
  updatedAt: true,
  deletesAt: true,
  favorite: true,
  id: true,
  originalName: true,
  name: true,
  size: true,
  type: true,
  views: true,
  maxViews: true,
  folderId: true,
  anonymous: true,
  thumbnail: true,
  tags: true,
} as const;

export type FileRow = typeof files.$inferSelect;
export type FileInsert = typeof files.$inferInsert;
export type FileUpdate = Partial<Omit<FileInsert, 'id' | 'createdAt' | 'updatedAt'>>;
export type FileOwner = Pick<typeof users.$inferSelect, 'id' | 'role' | 'view'>;
export type FileFolder = Pick<typeof folders.$inferSelect, 'id' | 'name' | 'public'>;

export type HydratedFile = FileRow & {
  thumbnail: { path: string } | null;
  tags: (typeof tags.$inferSelect)[];
  User?: FileOwner | null;
  Folder?: FileFolder | null;
};

export type FileHydration = {
  thumbnail?: boolean;
  tags?: boolean;
  owner?: boolean;
  folder?: boolean;
};

export type FileListOptions = FileHydration & {
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

async function hydrateFileRows(
  rows: FileRow[],
  options: FileHydration = { thumbnail: true, tags: true },
  client: DbClient = db,
): Promise<HydratedFile[]> {
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const thumbnailByFile = new Map<string, { path: string }>();
  const tagsByFile = new Map<string, (typeof tags.$inferSelect)[]>();
  const ownerById = new Map<string, FileOwner>();
  const folderById = new Map<string, FileFolder>();

  if (options.thumbnail !== false) {
    const thumbnailRows = await client
      .select({ fileId: thumbnails.fileId, path: thumbnails.path })
      .from(thumbnails)
      .where(inArray(thumbnails.fileId, ids));
    for (const thumbnail of thumbnailRows) thumbnailByFile.set(thumbnail.fileId, { path: thumbnail.path });
  }

  if (options.tags !== false) {
    const tagRows = await client
      .select({ fileId: filesToTags.fileId, tag: tags })
      .from(filesToTags)
      .innerJoin(tags, eq(tags.id, filesToTags.tagId))
      .where(inArray(filesToTags.fileId, ids));
    for (const entry of tagRows) {
      const current = tagsByFile.get(entry.fileId) ?? [];
      current.push(entry.tag);
      tagsByFile.set(entry.fileId, current);
    }
  }

  if (options.owner) {
    const ownerIds = [...new Set(rows.flatMap((row) => (row.userId ? [row.userId] : [])))];
    if (ownerIds.length) {
      const ownerRows = await client
        .select({ id: users.id, role: users.role, view: users.view })
        .from(users)
        .where(inArray(users.id, ownerIds));
      for (const owner of ownerRows)
        ownerById.set(owner.id, { ...owner, view: userViewSchema.parse(owner.view) });
    }
  }

  if (options.folder) {
    const folderIds = [...new Set(rows.flatMap((row) => (row.folderId ? [row.folderId] : [])))];
    if (folderIds.length) {
      const folderRows = await client
        .select({ id: folders.id, name: folders.name, public: folders.public })
        .from(folders)
        .where(inArray(folders.id, folderIds));
      for (const folder of folderRows) folderById.set(folder.id, folder);
    }
  }

  return rows.map(
    (row) =>
      ({
        ...row,
        ...(options.thumbnail !== false && { thumbnail: thumbnailByFile.get(row.id) ?? null }),
        ...(options.tags !== false && { tags: tagsByFile.get(row.id) ?? [] }),
        ...(options.owner && { User: row.userId ? (ownerById.get(row.userId) ?? null) : null }),
        ...(options.folder && { Folder: row.folderId ? (folderById.get(row.folderId) ?? null) : null }),
      }) as HydratedFile,
  );
}

export async function listFiles(options: FileListOptions = {}, client: DbClient = db) {
  let query = client.select().from(files).where(options.where).$dynamic();
  if (options.orderBy) {
    const order = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
    query = query.orderBy(...order);
  }
  if (options.offset !== undefined) query = query.offset(options.offset);
  if (options.limit !== undefined) query = query.limit(options.limit);
  return hydrateFileRows(await query, options, client);
}

export async function listFileRows(
  options: Pick<FileListOptions, 'where' | 'orderBy' | 'offset' | 'limit'> = {},
  client: DbClient = db,
) {
  let query = client.select().from(files).where(options.where).$dynamic();
  if (options.orderBy) {
    const order = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
    query = query.orderBy(...order);
  }
  if (options.offset !== undefined) query = query.offset(options.offset);
  if (options.limit !== undefined) query = query.limit(options.limit);
  return query;
}

export async function countFiles(where?: SQL, client: DbClient = db) {
  const rows = await client.select({ value: count() }).from(files).where(where);
  return rows[0]?.value ?? 0;
}

export async function fileUsageForUser(userId: string, client: DbClient = db) {
  const rows = await client
    .select({ count: count(), size: sum(files.size) })
    .from(files)
    .where(eq(files.userId, userId));
  return { count: rows[0]?.count ?? 0, size: Number(rows[0]?.size ?? 0) };
}

export async function lockFileOwner(userId: string, client: DbClient) {
  return client.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
}

export async function findFileRowById(id: string, client: DbClient = db) {
  const rows = await client.select().from(files).where(eq(files.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findFileRowByName(name: string, client: DbClient = db) {
  const rows = await client.select().from(files).where(eq(files.name, name)).limit(1);
  return rows[0] ?? null;
}

export async function findFileRowByIdentifier(identifier: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(files)
    .where(or(eq(files.id, identifier), eq(files.name, identifier)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findFileByIdentifier(
  identifier: string,
  options: FileHydration = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const row = await findFileRowByIdentifier(identifier, client);
  return row ? (await hydrateFileRows([row], options, client))[0] : null;
}

export async function findFileById(
  id: string,
  options: FileHydration = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const row = await findFileRowById(id, client);
  return row ? (await hydrateFileRows([row], options, client))[0] : null;
}

export async function findFileByName(
  identifier: string,
  options: FileHydration = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const name = sanitizeFilename(identifier);
  if (!name) return null;

  let rows = await client.select().from(files).where(eq(files.name, name)).limit(1);
  if (!rows[0] && config.files.extensionlessUrls && !name.includes('.')) {
    const escaped = name.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
    rows = await client
      .select()
      .from(files)
      .where(sql`${files.name} LIKE ${`${escaped}.%`} ESCAPE '\\'`)
      .orderBy(desc(files.createdAt))
      .limit(1);
  }

  return rows[0] ? (await hydrateFileRows([rows[0]], options, client))[0] : null;
}

export async function findFilesByIds(
  ids: string[],
  options: FileHydration = { thumbnail: false, tags: false },
  client: DbClient = db,
) {
  if (!ids.length) return [];
  return hydrateFileRows(await client.select().from(files).where(inArray(files.id, ids)), options, client);
}

export async function fileNamesExist(names: string[], client: DbClient = db) {
  if (!names.length) return false;
  const rows = await client.select({ id: files.id }).from(files).where(inArray(files.name, names)).limit(1);
  return rows.length > 0;
}

export async function createFile(data: FileInsert, client: DbClient = db) {
  const rows = await client.insert(files).values(data).returning();
  if (!rows[0]) throw new Error('File insert did not return a row');
  return rows[0];
}

export async function createFiles(data: FileInsert[], client: DbClient = db) {
  if (!data.length) return [];
  return client.insert(files).values(data).returning();
}

export async function createFileHydrated(
  data: FileInsert,
  options: FileHydration = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  return (await hydrateFileRows([await createFile(data, client)], options, client))[0];
}

export async function updateFile(id: string, data: FileUpdate, client: DbClient = db) {
  const rows = await client.update(files).set(data).where(eq(files.id, id)).returning();
  return rows[0] ?? null;
}

export async function updateFileHydrated(
  id: string,
  data: FileUpdate,
  options: FileHydration = { thumbnail: true, tags: true },
  client: DbClient = db,
) {
  const row = await updateFile(id, data, client);
  return row ? (await hydrateFileRows([row], options, client))[0] : null;
}

export async function incrementFileViews(id: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ views: sql`${files.views} + 1` })
    .where(eq(files.id, id))
    .returning({ id: files.id });
  return rows.length > 0;
}

export async function updateFilesByIds(
  ids: string[],
  data: FileUpdate,
  userId?: string,
  client: DbClient = db,
) {
  if (!ids.length) return 0;
  const rows = await client
    .update(files)
    .set(data)
    .where(and(inArray(files.id, ids), userId ? eq(files.userId, userId) : undefined))
    .returning({ id: files.id });
  return rows.length;
}

export async function deleteFileById(id: string, client: DbClient = db) {
  const rows = await client.delete(files).where(eq(files.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteFilesByIds(ids: string[], client: DbClient = db) {
  if (!ids.length) return 0;
  const rows = await client.delete(files).where(inArray(files.id, ids)).returning({ id: files.id });
  return rows.length;
}

export async function replaceFileTags(fileId: string, tagIds: string[], client: DbClient = db) {
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
    const row = await updateFile(id, data, tx);
    if (!row) return null;
    if (tagIds) await replaceFileTags(id, tagIds, tx);
    return (await hydrateFileRows([row], { thumbnail: true, tags: true }, tx))[0];
  });
}

export async function listExpiredFiles(now = new Date(), client: DbClient = db) {
  return client
    .select({ id: files.id, name: files.name, size: files.size })
    .from(files)
    .where(and(isNotNull(files.deletesAt), lte(files.deletesAt, now)));
}

export async function listFilesAtMaxViews(client: DbClient = db) {
  return client
    .select({ id: files.id, name: files.name, size: files.size })
    .from(files)
    .where(and(isNotNull(files.maxViews), sql`${files.views} >= ${files.maxViews}`));
}

export async function listVideoFilesNeedingThumbnails(rerun = false, client: DbClient = db) {
  const conditions: SQL[] = [sql`${files.type} LIKE 'video/%'`, sql`${files.size} > 0`];
  if (!rerun) {
    conditions.push(sql`NOT EXISTS (SELECT 1 FROM ${thumbnails} WHERE ${thumbnails.fileId} = ${files.id})`);
  }
  return client
    .select({ id: files.id })
    .from(files)
    .where(and(...conditions));
}

export async function fileBelongsToFolder(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.folderId, folderId)))
    .limit(1);
  return rows.length > 0;
}

export function cleanFiles<T extends Partial<File>>(rows: T[], stringifyDates = false): T[] {
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

export const fileSchema = z.object({
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
  deletesAt: z.union([z.date(), z.string()]).nullable(),
  favorite: z.boolean(),
  id: z.string(),
  originalName: z.string().nullable(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  views: z.number(),
  maxViews: z.number().nullish(),
  password: z.union([z.string(), z.boolean()]).nullish(),
  folderId: z.string().nullable(),
  anonymous: z.boolean().nullish(),
  thumbnail: z.object({ path: z.string() }).nullable(),
  tags: z.array(tagSchema).optional(),
  url: z.string().optional(),
  similarity: z.number().optional(),
});

export type File = z.infer<typeof fileSchema>;
