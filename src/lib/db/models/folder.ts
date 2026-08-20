import { db, type Database, type DbClient } from '@/lib/db';
import { files, folders } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  formatFiles,
  fileListRelations,
  filePasswordScalarConfig,
  fileSchema,
  updateFiles,
  type ProjectedFile,
} from './file';

type FolderRow = typeof folders.$inferSelect;
type FolderInsert = typeof folders.$inferInsert;
type FolderUpdate = Omit<PgUpdateSetSource<typeof folders>, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

type FolderParent = {
  id: string;
  name: string;
  parentId: string | null;
  parent?: FolderParent | null;
};

type FolderParentPublic = FolderParent & { public: boolean; parent?: FolderParentPublic | null };

type FolderCount = { children: number; files: number };

type FolderSummary = FolderRow & {
  parent: FolderParent | null;
  _count: FolderCount;
  files?: ProjectedFile[];
};

type FolderDetail = FolderSummary & {
  children: (FolderRow & { _count: FolderCount })[];
};

type PublicFolder = FolderRow & {
  parent: FolderParentPublic | null;
  children: (Pick<FolderRow, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'public'> & {
    _count: FolderCount;
  })[];
};

type FolderFindManyConfig = NonNullable<Parameters<Database['query']['folders']['findMany']>[0]>;
type FolderQueryOptions = Pick<FolderFindManyConfig, 'where' | 'orderBy' | 'limit' | 'offset'>;

// TODO: i dont like this but whatever
const folderCountExtras = {
  childrenCount: (folder) => sql<number>`(
      select count(*)::int
      from "Folder" as "countedChildren"
      where "countedChildren"."parentId" = ${folder.id}
    )`,
  filesCount: (folder) => sql<number>`(
      select count(*)::int
      from "File" as "countedFiles"
      where "countedFiles"."folderId" = ${folder.id}
    )`,
} as const satisfies NonNullable<FolderFindManyConfig['extras']>;

const folderParentColumns = { id: true, name: true, parentId: true } as const;

const folderFilesConfig = {
  ...filePasswordScalarConfig,
  orderBy: { createdAt: 'desc' },
  with: fileListRelations,
} as const;

const folderChildrenConfig = {
  orderBy: { createdAt: 'desc' },
  extras: folderCountExtras,
} as const;

async function queryFolderSummaries(options: FolderQueryOptions, client: DbClient) {
  return client.query.folders.findMany({
    ...options,
    extras: folderCountExtras,
    with: { parent: { columns: folderParentColumns } },
  });
}

async function queryFolderSummariesWithFiles(options: FolderQueryOptions, client: DbClient) {
  return client.query.folders.findMany({
    ...options,
    extras: folderCountExtras,
    with: { parent: { columns: folderParentColumns }, files: folderFilesConfig },
  });
}

function mapCounts<T extends { childrenCount: number; filesCount: number }>(row: T) {
  const { childrenCount, filesCount, ...rest } = row;
  return { ...rest, _count: { children: childrenCount, files: filesCount } };
}

type FolderSummaryRow = Awaited<ReturnType<typeof queryFolderSummaries>>[number];

function mapFolderSummary(row: FolderSummaryRow): FolderSummary {
  return mapCounts(row);
}

function mapFolderSummaryWithFiles(
  row: Awaited<ReturnType<typeof queryFolderSummariesWithFiles>>[number],
): FolderSummary {
  return mapCounts(row);
}

export async function getFolderMetadata(id: string, client: DbClient = db) {
  const rows = await client
    .select({
      id: folders.id,
      name: folders.name,
      userId: folders.userId,
      allowUploads: folders.allowUploads,
    })
    .from(folders)
    .where(eq(folders.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOwnedFolder(id: string, userId: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFolderWithOwner(id: string, client: DbClient = db) {
  const row = await client.query.folders.findFirst({
    columns: { id: true, userId: true },
    where: { id },
    with: {
      user: {
        columns: { id: true, role: true },
      },
    },
  });
  return row ?? null;
}

export async function listFolders(
  userId: string,
  options: { root?: boolean; parentId?: string; includeFiles?: boolean } = {},
  client: DbClient = db,
): Promise<FolderSummary[]> {
  const query: FolderQueryOptions = {
    where: {
      AND: [
        { userId },
        ...(options.root ? [{ parentId: { isNull: true } } as const] : []),
        ...(options.parentId ? [{ parentId: options.parentId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
  };
  if (options.includeFiles) {
    return (await queryFolderSummariesWithFiles(query, client)).map(mapFolderSummaryWithFiles);
  }
  return (await queryFolderSummaries(query, client)).map(mapFolderSummary);
}

export async function getFolder(
  id: string,
  includeFiles = true,
  client: DbClient = db,
): Promise<FolderDetail | null> {
  if (includeFiles) {
    const row = await client.query.folders.findFirst({
      where: { id },
      extras: folderCountExtras,
      with: {
        parent: { columns: folderParentColumns },
        children: folderChildrenConfig,
        files: folderFilesConfig,
      },
    });
    if (!row) return null;
    const { children, ...rest } = row;
    return { ...mapCounts(rest), children: children.map(mapCounts) };
  }

  const row = await client.query.folders.findFirst({
    where: { id },
    extras: folderCountExtras,
    with: {
      parent: { columns: folderParentColumns },
      children: folderChildrenConfig,
    },
  });
  if (!row) return null;
  const { children, ...rest } = row;
  return { ...mapCounts(rest), children: children.map(mapCounts) };
}

export async function getPublicFolder(
  identifier: string,
  client: DbClient = db,
): Promise<PublicFolder | null> {
  const row = await client.query.folders.findFirst({
    where: { OR: [{ id: identifier }, { name: identifier }] },
    with: {
      parent: { columns: { ...folderParentColumns, public: true } },
      children: {
        ...folderChildrenConfig,
        where: { public: true },
        columns: { id: true, name: true, createdAt: true, updatedAt: true, public: true },
      },
    },
  });
  if (!row) return null;
  const { children, parent, ...rest } = row;
  return {
    ...rest,
    parent: parent?.public ? parent : null,
    children: children.map(mapCounts),
  };
}

export async function createFolder(data: FolderInsert, fileIds: string[] = []): Promise<FolderSummary> {
  return db.transaction(async (tx) => {
    const rows = await tx.insert(folders).values(data).returning({ id: folders.id });
    const row = rows[0];
    if (!row) throw new Error('Folder insert did not return a row');
    if (fileIds.length) await updateFiles(fileIds, { folderId: row.id }, data.userId, tx);
    const [created] = await queryFolderSummariesWithFiles({ where: { id: row.id }, limit: 1 }, tx);
    if (!created) throw new Error('Inserted folder could not be read back');
    return mapFolderSummaryWithFiles(created);
  });
}

async function getFolderSummary(id: string, client: DbClient) {
  const [row] = await queryFolderSummaries({ where: { id }, limit: 1 }, client);
  return row ? mapFolderSummary(row) : null;
}

export async function updateFolder(id: string, data: FolderUpdate, client: DbClient = db) {
  const rows = await client.update(folders).set(data).where(eq(folders.id, id)).returning({ id: folders.id });
  if (!rows[0]) return null;
  return getFolderSummary(id, client);
}

export async function addFile(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ folderId })
    .where(eq(files.id, fileId))
    .returning({ id: files.id });
  if (!rows[0]) return null;
  return getFolderSummary(folderId, client);
}

export async function removeFile(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ folderId: null })
    .where(and(eq(files.id, fileId), eq(files.folderId, folderId)))
    .returning({ id: files.id });
  if (!rows[0]) return null;
  return getFolderSummary(folderId, client);
}

type FolderAncestorRow = Pick<FolderRow, 'id' | 'name' | 'parentId' | 'public' | 'userId'> & {
  depth: number;
  cycle: boolean;
};

async function folderAncestors(parentId: string | null, publicOnly = false, client: DbClient = db) {
  if (!parentId) return [];

  const result = await client.execute<FolderAncestorRow>(sql`
    with recursive "folderAncestors" as (
      select
        ${folders.id} as "id",
        ${folders.name} as "name",
        ${folders.parentId} as "parentId",
        ${folders.public} as "public",
        ${folders.userId} as "userId",
        0::int as "depth",
        array[${folders.id}]::text[] as "path",
        false as "cycle"
      from ${folders}
      where ${folders.id} = ${parentId}
        ${publicOnly ? sql`and ${folders.public} = true` : sql``}

      union all

      select
        "parent"."id",
        "parent"."name",
        "parent"."parentId",
        "parent"."public",
        "parent"."userId",
        "current"."depth" + 1,
        "current"."path" || "parent"."id",
        "parent"."id" = any("current"."path")
      from ${folders} as "parent"
      inner join "folderAncestors" as "current"
        on "parent"."id" = "current"."parentId"
      where not "current"."cycle"
        ${publicOnly ? sql`and "parent"."public" = true` : sql``}
    )
    select "id", "name", "parentId", "public", "userId", "depth", "cycle"
    from "folderAncestors"
    order by "depth"
  `);

  return result.rows;
}

export async function getParentChain(
  parentId: string | null,
  client: DbClient = db,
): Promise<FolderParent | null> {
  const rows = await folderAncestors(parentId, false, client);
  let parent: FolderParent | null = null;
  for (const row of rows.filter((row) => !row.cycle).toReversed()) {
    parent = { id: row.id, name: row.name, parentId: row.parentId, parent };
  }
  return parent;
}

export async function getPublicParentChain(
  parentId: string | null,
  client: DbClient = db,
): Promise<FolderParentPublic | null> {
  const rows = await folderAncestors(parentId, true, client);
  let parent: FolderParentPublic | null = null;
  for (const row of rows.filter((row) => !row.cycle).toReversed()) {
    parent = { id: row.id, name: row.name, parentId: row.parentId, public: row.public, parent };
  }
  return parent;
}

export async function getParentStatus(folderId: string, parentId: string, userId: string) {
  if (folderId === parentId) return 'cycle' as const;
  const ancestors = await folderAncestors(parentId);
  const parent = ancestors[0];
  if (!parent) return 'missing' as const;
  if (parent.userId !== userId) return 'foreign' as const;
  if (ancestors.some((ancestor) => ancestor.id === folderId || ancestor.cycle)) return 'cycle' as const;
  return 'ok' as const;
}

export type FolderTree = {
  id: string;
  name: string;
  files: { id: string; name: string }[];
  children: FolderTree[];
};

export async function getOwnedTree(
  folderId: string,
  userId: string,
  client: DbClient = db,
): Promise<FolderTree | null> {
  const descendantIds = await folderDescendantIds(folderId, client);
  if (!descendantIds.length) return null;

  const rows = await client.query.folders.findMany({
    columns: { id: true, name: true, parentId: true },
    where: { userId, id: { in: descendantIds } },
    orderBy: { createdAt: 'asc' },
    with: {
      files: { columns: { id: true, name: true } },
    },
  });
  const byId = new Map(rows.map((folder) => [folder.id, folder]));
  if (!byId.has(folderId)) return null;
  const byParent = Map.groupBy(rows, (folder) => folder.parentId);
  const buildTree = (id: string, ancestors = new Set<string>()): FolderTree | null => {
    const folder = byId.get(id);
    if (!folder || ancestors.has(id)) return null;
    const nextAncestors = new Set(ancestors).add(id);
    return {
      id: folder.id,
      name: folder.name,
      files: folder.files,
      children: (byParent.get(id) ?? [])
        .map((child) => buildTree(child.id, nextAncestors))
        .filter((child): child is FolderTree => child !== null),
    };
  };

  return buildTree(folderId);
}

async function folderDescendantIds(folderId: string, client: DbClient) {
  const result = await client.execute<Pick<FolderRow, 'id'>>(sql`
    with recursive "folderDescendants" as (
      select ${folders.id} as "id"
      from ${folders}
      where ${folders.id} = ${folderId}

      union

      select "child"."id"
      from ${folders} as "child"
      inner join "folderDescendants" as "parent"
        on "child"."parentId" = "parent"."id"
    )
    select "id" from "folderDescendants"
  `);
  return result.rows.map(({ id }) => id);
}

export async function removeFolder(
  folderId: string,
  action?: 'root' | 'folder' | 'cascade' | 'cascade-files',
  targetFolderId?: string,
) {
  return db.transaction(async (tx) => {
    const fileNames: string[] = [];

    if (action === 'root') {
      await tx.update(folders).set({ parentId: null }).where(eq(folders.parentId, folderId));
      await tx.update(files).set({ folderId: null }).where(eq(files.folderId, folderId));
    } else if (action === 'folder' && !targetFolderId) {
      return { success: false, isCascade: false, fileNames };
    } else if (action === 'folder') {
      await tx.update(folders).set({ parentId: targetFolderId }).where(eq(folders.parentId, folderId));
      await tx.update(files).set({ folderId: targetFolderId }).where(eq(files.folderId, folderId));
    } else if (action === 'cascade' || action === 'cascade-files') {
      const deleteFiles = action === 'cascade-files';
      const descendantIds = await folderDescendantIds(folderId, tx);
      if (deleteFiles && descendantIds.length) {
        const deletedFiles = await tx
          .delete(files)
          .where(inArray(files.folderId, descendantIds))
          .returning({ name: files.name });
        fileNames.push(...deletedFiles.map((file) => file.name));
      }
      if (descendantIds.length) await tx.delete(folders).where(inArray(folders.id, descendantIds));
      return { success: true, isCascade: true, fileNames };
    }

    const deleted = await tx.delete(folders).where(eq(folders.id, folderId)).returning({ id: folders.id });
    return { success: deleted.length > 0, isCascade: false, fileNames };
  });
}

type CleanableFolder = {
  createdAt?: string | Date;
  updatedAt?: string | Date;
  files?: Partial<z.infer<typeof fileSchema>>[];
  children?: CleanableFolder[];
  parent?: CleanableFolder | null;
};

export function formatFolder<T extends CleanableFolder>(folder: T, stringifyDates = false): T {
  if (folder.files) formatFiles(folder.files, stringifyDates);
  if (stringifyDates) {
    if (folder.createdAt instanceof Date) folder.createdAt = folder.createdAt.toISOString();
    if (folder.updatedAt instanceof Date) folder.updatedAt = folder.updatedAt.toISOString();
  }
  if (folder.children) for (const child of folder.children) formatFolder(child, stringifyDates);
  if (folder.parent) formatFolder(folder.parent, stringifyDates);
  return folder;
}

const folderScalarSchema = createSelectSchema(folders, {
  createdAt: (schema) => z.union([schema, z.string()]),
  updatedAt: (schema) => z.union([schema, z.string()]),
});

const folderCountSchema = z.object({
  children: z.number().optional(),
  files: z.number().optional(),
});

const folderParentScalarSchema = createSelectSchema(folders).pick({
  id: true,
  name: true,
  parentId: true,
});

const folderParentSchema: z.ZodType<FolderParent> = z.lazy(() =>
  folderParentScalarSchema.extend({
    parent: folderParentSchema.nullable().optional(),
  }),
);

const folderParentPublicScalarSchema = createSelectSchema(folders).pick({
  public: true,
  id: true,
  name: true,
  parentId: true,
});

const folderParentPublicSchema: z.ZodType<FolderParentPublic> = z.lazy(() =>
  folderParentPublicScalarSchema.extend({
    parent: folderParentPublicSchema.nullable().optional(),
  }),
);

const privateFolderChildSchema = folderScalarSchema.extend({
  _count: folderCountSchema.optional(),
});

const publicFolderChildSchema = folderScalarSchema
  .pick({
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    public: true,
  })
  .extend({ _count: folderCountSchema.optional() });

export const folderSchema = folderScalarSchema.extend({
  files: z.array(fileSchema).optional(),
  parent: z.union([folderParentPublicSchema, folderParentSchema]).nullable().optional(),
  children: z.array(z.union([privateFolderChildSchema, publicFolderChildSchema])).optional(),
  _count: folderCountSchema.optional(),
});

export const publicFolderSchema = folderScalarSchema.extend({
  files: z.array(fileSchema).optional(),
  parent: folderParentPublicSchema.nullable().optional(),
  children: z.array(publicFolderChildSchema).optional(),
  _count: folderCountSchema.optional(),
});

export type Folder = z.infer<typeof folderSchema>;
