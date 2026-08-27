import { ApiError } from '@/lib/api/errors';
import { db, type DbClient } from '@/lib/db';
import { files, folders } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { fileColumns, filePasswordExtra, fileRelations, fileSchema, formatFiles } from './file';

type FolderRow = typeof folders.$inferSelect;
type FolderInsert = typeof folders.$inferInsert;
type FolderUpdate = Partial<Omit<FolderInsert, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>;

type FolderParent = {
  id: string;
  name: string;
  parentId: string | null;
  parent?: FolderParent | null;
};

type FolderParentPublic = FolderParent & { public: boolean; parent?: FolderParentPublic | null };

type FolderCount = { children: number; files: number };

const folderCountExtra = {
  _count: (folder: typeof folders) => sql<FolderCount>`json_build_object(
    'children', ${db.$count(folders, eq(folders.parentId, folder.id))},
    'files', ${db.$count(files, eq(files.folderId, folder.id))}
  )`,
} as const;

const folderParentColumns = { id: true, name: true, parentId: true } as const;

const folderFilesConfig = {
  columns: fileColumns,
  extras: filePasswordExtra,
  orderBy: { createdAt: 'desc' },
  with: fileRelations,
} as const;

const folderChildrenConfig = {
  orderBy: { createdAt: 'desc' },
  extras: folderCountExtra,
} as const;

export async function getFolderMetadata(id: string, client: DbClient = db) {
  const folder = await client.query.folders.findFirst({
    columns: { id: true, name: true, userId: true, allowUploads: true },
    where: { id },
  });
  return folder ?? null;
}

export async function getOwnedFolder(id: string, userId: string, client: DbClient = db) {
  const folder = await client.query.folders.findFirst({ where: { id, userId } });
  return folder ?? null;
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
) {
  let parentId;
  if (options.parentId) parentId = options.parentId;
  else if (options.root) parentId = { isNull: true as const };

  const where = { userId, parentId };

  if (options.includeFiles) {
    return client.query.folders.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      extras: folderCountExtra,
      with: { parent: { columns: folderParentColumns }, files: folderFilesConfig },
    });
  }

  return client.query.folders.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    extras: folderCountExtra,
    with: { parent: { columns: folderParentColumns } },
  });
}

export async function getFolder(id: string, includeFiles = true, client: DbClient = db) {
  if (includeFiles) {
    const row = await client.query.folders.findFirst({
      where: { id },
      extras: folderCountExtra,
      with: {
        parent: { columns: folderParentColumns },
        children: folderChildrenConfig,
        files: folderFilesConfig,
      },
    });
    return row ?? null;
  }

  const row = await client.query.folders.findFirst({
    where: { id },
    extras: folderCountExtra,
    with: {
      parent: { columns: folderParentColumns },
      children: folderChildrenConfig,
    },
  });
  return row ?? null;
}

export async function getPublicFolder(identifier: string, client: DbClient = db) {
  const row = await client.query.folders.findFirst({
    where: { OR: [{ id: identifier }, { name: identifier }] },
    with: {
      parent: { columns: { ...folderParentColumns, public: true }, where: { public: true } },
      children: {
        ...folderChildrenConfig,
        where: { public: true },
        columns: { id: true, name: true, createdAt: true, updatedAt: true, public: true },
      },
    },
  });
  return row ?? null;
}

export async function createFolder(data: FolderInsert, fileIds: string[] = []) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(folders).values(data).returning({ id: folders.id });
    if (!row) throw new ApiError(9005);

    if (fileIds.length) {
      await tx
        .update(files)
        .set({ folderId: row.id })
        .where(and(inArray(files.id, fileIds), eq(files.userId, data.userId)));
    }

    const created = await tx.query.folders.findFirst({
      where: { id: row.id },
      extras: folderCountExtra,
      with: { parent: { columns: folderParentColumns }, files: folderFilesConfig },
    });
    if (!created) throw new ApiError(9005);

    return created;
  });
}

async function getFolderSummary(id: string, client: DbClient) {
  const row = await client.query.folders.findFirst({
    where: { id },
    extras: folderCountExtra,
    with: { parent: { columns: folderParentColumns } },
  });
  return row ?? null;
}

export async function updateFolder(id: string, data: FolderUpdate, client: DbClient = db) {
  if (Object.keys(data).length) {
    const [row] = await client
      .update(folders)
      .set(data)
      .where(eq(folders.id, id))
      .returning({ id: folders.id });
    if (!row) return null;
  }

  return getFolderSummary(id, client);
}

export async function addFile(fileId: string, folderId: string, client: DbClient = db) {
  const [row] = await client
    .update(files)
    .set({ folderId })
    .where(eq(files.id, fileId))
    .returning({ id: files.id });
  if (!row) return null;

  return getFolderSummary(folderId, client);
}

export async function removeFile(fileId: string, folderId: string, client: DbClient = db) {
  const [row] = await client
    .update(files)
    .set({ folderId: null })
    .where(and(eq(files.id, fileId), eq(files.folderId, folderId)))
    .returning({ id: files.id });
  if (!row) return null;

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
        ${sql`and ${folders.public} = true`.if(publicOnly)}

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
        ${sql`and "parent"."public" = true`.if(publicOnly)}
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

type FolderWithFiles = {
  files?: Partial<z.infer<typeof fileSchema>>[];
  [key: string]: unknown;
};

export function formatFolder<T extends FolderWithFiles>(folder: T): T {
  if (folder.files) formatFiles(folder.files);
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
