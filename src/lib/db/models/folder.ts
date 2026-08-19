import { db, type Database } from '@/lib/db';
import { files, folders, users } from '@/lib/db/schema';
import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  formatFiles,
  defaultFileRelationConfig,
  filePasswordScalarConfig,
  fileSchema,
  mapFileTags,
  updateFiles,
  type PasswordProjectedFile,
  type PasswordProjectedFileRelationResult,
} from './file';
import type { DbClient } from './user';

export type FolderRow = typeof folders.$inferSelect;
export type FolderInsert = typeof folders.$inferInsert;
export type FolderUpdate = Omit<
  PgUpdateSetSource<typeof folders>,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
>;
export type FolderOwner = Pick<typeof users.$inferSelect, 'id' | 'role'>;
export type PublicFolderChild = Pick<FolderRow, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'public'> & {
  _count?: { children?: number; files?: number };
};

export type FolderParent = {
  id: string;
  name: string;
  parentId: string | null;
  parent?: FolderParent | null;
};

export type FolderParentPublic = FolderParent & { public: boolean; parent?: FolderParentPublic | null };

export type FolderResult = FolderRow & {
  files?: PasswordProjectedFile[];
  parent?: FolderParent | FolderParentPublic | null;
  children?: ((FolderRow | PublicFolderChild) & {
    _count?: { children?: number; files?: number };
  })[];
  _count?: { children?: number; files?: number };
  User?: FolderOwner;
};

const folderCountExtras = {
  childrenCount: sql<number>`(
    select count(*)::int
    from "Folder" as "countedChildren"
    where "countedChildren"."parentId" = ${folders.id}
  )`.as('childrenCount'),
  filesCount: sql<number>`(
    select count(*)::int
    from "File" as "countedFiles"
    where "countedFiles"."folderId" = ${folders.id}
  )`.as('filesCount'),
};

type FolderQueryOptions = {
  where?: SQL;
  orderBy?: SQL | SQL[];
  offset?: number;
  limit?: number;
  files?: boolean;
  children?: boolean;
  publicChildrenOnly?: boolean;
  parent?: boolean;
  publicParentOnly?: boolean;
  counts?: boolean;
  childrenCounts?: boolean;
};

type FolderFindManyConfig = NonNullable<Parameters<Database['query']['folders']['findMany']>[0]>;
type FolderWith = NonNullable<FolderFindManyConfig['with']>;

function folderRelationConfig(options: FolderQueryOptions) {
  return {
    files: options.files
      ? {
          ...filePasswordScalarConfig,
          orderBy: desc(files.createdAt),
          with: defaultFileRelationConfig,
        }
      : undefined,
    parent: options.parent
      ? {
          columns: options.publicParentOnly
            ? {
                id: true as const,
                name: true as const,
                parentId: true as const,
                public: true as const,
              }
            : {
                id: true as const,
                name: true as const,
                parentId: true as const,
              },
        }
      : undefined,
    children: options.children
      ? {
          where: options.publicChildrenOnly ? eq(folders.public, true) : undefined,
          orderBy: desc(folders.createdAt),
          columns: options.publicChildrenOnly
            ? {
                id: true as const,
                name: true as const,
                createdAt: true as const,
                updatedAt: true as const,
                public: true as const,
              }
            : undefined,
          extras: folderCountExtras,
        }
      : undefined,
  } satisfies FolderWith;
}

async function queryFolderRelations(options: FolderQueryOptions, client: DbClient) {
  return client.query.folders.findMany({
    where: options.where,
    orderBy: options.orderBy,
    offset: options.offset,
    limit: options.limit,
    with: folderRelationConfig(options),
    extras: folderCountExtras,
  });
}

type FolderRelationResult = Awaited<ReturnType<typeof queryFolderRelations>>[number];

function hasDefaultFileRelations(
  file: NonNullable<FolderRelationResult['files']>[number],
): file is PasswordProjectedFileRelationResult {
  return 'fileTags' in file && 'thumbnail' in file;
}

function mapFolderFile(file: NonNullable<FolderRelationResult['files']>[number]): PasswordProjectedFile {
  if (!hasDefaultFileRelations(file)) throw new Error('Folder file relations were not selected');

  return mapFileTags(file);
}

function mapFolderParent(
  parent: FolderRelationResult['parent'],
  publicOnly: boolean,
): FolderParent | FolderParentPublic | null {
  if (!parent) return null;
  if (!publicOnly) return { id: parent.id, name: parent.name, parentId: parent.parentId };
  if (!('public' in parent) || !parent.public) return null;
  return { id: parent.id, name: parent.name, parentId: parent.parentId, public: true };
}

function mapFolderRelations(
  row: FolderRelationResult,
  options: {
    files?: boolean;
    children?: boolean;
    publicParentOnly?: boolean;
    parent?: boolean;
    counts?: boolean;
    childrenCounts?: boolean;
  },
): FolderResult {
  const { files: relatedFiles, parent, children, childrenCount, filesCount, ...folder } = row;

  const result: FolderResult = {
    ...folder,
    ...(options.files && {
      files: (relatedFiles ?? []).map(mapFolderFile),
    }),
    ...(options.parent && {
      parent: mapFolderParent(parent, !!options.publicParentOnly),
    }),
    ...(options.children && {
      children: (children ?? []).map((row) => {
        const { childrenCount, filesCount, ...child } = {
          childrenCount: undefined,
          filesCount: undefined,
          ...row,
        };
        return {
          ...child,
          ...((options.childrenCounts ?? options.counts) && {
            _count: { children: childrenCount ?? 0, files: filesCount ?? 0 },
          }),
        };
      }),
    }),
    ...(options.counts && {
      _count: { children: childrenCount ?? 0, files: filesCount ?? 0 },
    }),
  };
  return result;
}

export async function getFolderMetadata(id: string, client: DbClient = db) {
  return (
    (await client.query.folders.findFirst({
      columns: { id: true, name: true, userId: true, allowUploads: true },
      where: eq(folders.id, id),
    })) ?? null
  );
}

export async function getOwnedFolder(id: string, userId: string, client: DbClient = db) {
  return (
    (await client.query.folders.findFirst({
      where: and(eq(folders.id, id), eq(folders.userId, userId)),
    })) ?? null
  );
}

export async function getFolderWithOwner(id: string, client: DbClient = db) {
  const row = await client.query.folders.findFirst({
    where: eq(folders.id, id),
    with: {
      User: {
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
) {
  const rows = await queryFolderRelations(
    {
      where: and(
        eq(folders.userId, userId),
        options.root ? isNull(folders.parentId) : undefined,
        options.parentId ? eq(folders.parentId, options.parentId) : undefined,
      ),
      orderBy: desc(folders.createdAt),
      files: options.includeFiles,
      parent: true,
      counts: true,
    },
    client,
  );
  return rows.map((row) =>
    mapFolderRelations(row, { files: options.includeFiles, parent: true, counts: true }),
  );
}

export async function getFolder(id: string, includeFiles = true, client: DbClient = db) {
  const [row] = await queryFolderRelations(
    {
      where: eq(folders.id, id),
      limit: 1,
      files: includeFiles,
      children: true,
      parent: true,
      counts: true,
      childrenCounts: true,
    },
    client,
  );
  return row
    ? mapFolderRelations(row, {
        files: includeFiles,
        children: true,
        parent: true,
        counts: true,
        childrenCounts: true,
      })
    : null;
}

export async function getPublicFolder(identifier: string, client: DbClient = db) {
  const [row] = await queryFolderRelations(
    {
      where: or(eq(folders.id, identifier), eq(folders.name, identifier)),
      limit: 1,
      children: true,
      publicChildrenOnly: true,
      childrenCounts: true,
      parent: true,
      publicParentOnly: true,
    },
    client,
  );
  return row
    ? mapFolderRelations(row, {
        children: true,
        childrenCounts: true,
        parent: true,
        publicParentOnly: true,
      })
    : null;
}

export async function createFolder(data: FolderInsert, fileIds: string[] = []) {
  return db.transaction(async (tx) => {
    const rows = await tx.insert(folders).values(data).returning();
    const row = rows[0];
    if (!row) throw new Error('Folder insert did not return a row');
    if (fileIds.length) await updateFiles(fileIds, { folderId: row.id }, data.userId, tx);
    const [created] = await queryFolderRelations(
      { where: eq(folders.id, row.id), limit: 1, files: true, parent: true, counts: true },
      tx,
    );
    if (!created) throw new Error('Inserted folder could not be read back');
    return mapFolderRelations(created, { files: true, parent: true, counts: true });
  });
}

export async function updateFolder(id: string, data: FolderUpdate, client: DbClient = db) {
  const rows = await client.update(folders).set(data).where(eq(folders.id, id)).returning();
  if (!rows[0]) return null;
  const [updated] = await queryFolderRelations(
    { where: eq(folders.id, id), limit: 1, parent: true, counts: true },
    client,
  );
  return updated ? mapFolderRelations(updated, { parent: true, counts: true }) : null;
}

export async function addFile(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ folderId })
    .where(eq(files.id, fileId))
    .returning({ id: files.id });
  if (!rows[0]) return null;
  const [folder] = await queryFolderRelations(
    { where: eq(folders.id, folderId), limit: 1, parent: true, counts: true },
    client,
  );
  return folder ? mapFolderRelations(folder, { parent: true, counts: true }) : null;
}

export async function removeFile(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ folderId: null })
    .where(and(eq(files.id, fileId), eq(files.folderId, folderId)))
    .returning({ id: files.id });
  if (!rows[0]) return null;
  const [folder] = await queryFolderRelations(
    { where: eq(folders.id, folderId), limit: 1, parent: true, counts: true },
    client,
  );
  return folder ? mapFolderRelations(folder, { parent: true, counts: true }) : null;
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
  const rows = await client.query.folders.findMany({
    columns: { id: true, name: true, parentId: true },
    where: eq(folders.userId, userId),
    orderBy: asc(folders.createdAt),
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
        const fileRows = await tx.query.files.findMany({
          columns: { id: true, name: true },
          where: inArray(files.folderId, descendantIds),
        });
        fileNames.push(...fileRows.map((file) => file.name));
        if (fileRows.length) {
          await tx.delete(files).where(
            inArray(
              files.id,
              fileRows.map((file) => file.id),
            ),
          );
        }
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
