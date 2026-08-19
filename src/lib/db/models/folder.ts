import { db } from '@/lib/db';
import { files, folders, users } from '@/lib/db/schema';
import { and, asc, count, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { cleanFiles, fileSchema, listFiles, updateFilesByIds } from './file';
import type { DbClient } from './user';

export type FolderRow = typeof folders.$inferSelect;
export type FolderInsert = typeof folders.$inferInsert;
export type FolderUpdate = Partial<Omit<FolderInsert, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>;
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

export type FolderWithRelations = FolderRow & {
  files?: Awaited<ReturnType<typeof listFiles>>;
  parent?: FolderParent | FolderParentPublic | null;
  children?: ((FolderRow | PublicFolderChild) & {
    _count?: { children?: number; files?: number };
  })[];
  _count?: { children?: number; files?: number };
  User?: FolderOwner;
};

export async function findFolderRowById(id: string, client: DbClient = db) {
  const rows = await client.select().from(folders).where(eq(folders.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findOwnedFolderById(id: string, userId: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findFolderByIdentifier(identifier: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(folders)
    .where(or(eq(folders.id, identifier), eq(folders.name, identifier)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findFolderWithOwner(id: string, client: DbClient = db) {
  const rows = await client
    .select({ folder: folders, owner: { id: users.id, role: users.role } })
    .from(folders)
    .innerJoin(users, eq(users.id, folders.userId))
    .where(eq(folders.id, id))
    .limit(1);
  return rows[0] ? { ...rows[0].folder, User: rows[0].owner } : null;
}

async function countFolderChildren(id: string, client: DbClient) {
  const rows = await client.select({ value: count() }).from(folders).where(eq(folders.parentId, id));
  return rows[0]?.value ?? 0;
}

async function countFolderFiles(id: string, client: DbClient) {
  const rows = await client.select({ value: count() }).from(files).where(eq(files.folderId, id));
  return rows[0]?.value ?? 0;
}

async function parentSummary(parentId: string | null, publicOnly: boolean, client: DbClient) {
  if (!parentId) return null;
  const rows = await client
    .select({
      id: folders.id,
      name: folders.name,
      parentId: folders.parentId,
      public: folders.public,
    })
    .from(folders)
    .where(and(eq(folders.id, parentId), publicOnly ? eq(folders.public, true) : undefined))
    .limit(1);
  return rows[0] ?? null;
}

async function hydrateFolder(
  row: FolderRow,
  options: {
    files?: boolean;
    children?: boolean;
    publicChildrenOnly?: boolean;
    parent?: boolean;
    publicParentOnly?: boolean;
    counts?: boolean;
    childrenCounts?: boolean;
  },
  client: DbClient,
): Promise<FolderWithRelations> {
  const result: FolderWithRelations = { ...row };
  if (options.files) {
    result.files = await listFiles(
      { where: eq(files.folderId, row.id), orderBy: desc(files.createdAt), thumbnail: true, tags: true },
      client,
    );
  }
  if (options.parent) result.parent = await parentSummary(row.parentId, !!options.publicParentOnly, client);
  if (options.counts) {
    result._count = {
      children: await countFolderChildren(row.id, client),
      files: await countFolderFiles(row.id, client),
    };
  }
  if (options.children) {
    const childRows = options.publicChildrenOnly
      ? await client
          .select({
            id: folders.id,
            name: folders.name,
            createdAt: folders.createdAt,
            updatedAt: folders.updatedAt,
            public: folders.public,
          })
          .from(folders)
          .where(and(eq(folders.parentId, row.id), eq(folders.public, true)))
          .orderBy(desc(folders.createdAt))
      : await client
          .select()
          .from(folders)
          .where(eq(folders.parentId, row.id))
          .orderBy(desc(folders.createdAt));
    result.children = [];
    for (const child of childRows) {
      result.children.push({
        ...child,
        _count:
          (options.childrenCounts ?? options.counts)
            ? {
                children: await countFolderChildren(child.id, client),
                files: await countFolderFiles(child.id, client),
              }
            : undefined,
      });
    }
  }
  return result;
}

export async function listFoldersForUser(
  userId: string,
  options: { root?: boolean; parentId?: string; includeFiles?: boolean } = {},
  client: DbClient = db,
) {
  const rows = await client
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.userId, userId),
        options.root ? isNull(folders.parentId) : undefined,
        options.parentId ? eq(folders.parentId, options.parentId) : undefined,
      ),
    )
    .orderBy(desc(folders.createdAt));
  const result: FolderWithRelations[] = [];
  for (const row of rows) {
    result.push(
      await hydrateFolder(row, { files: options.includeFiles, parent: true, counts: true }, client),
    );
  }
  return result;
}

export async function getFolderDetails(id: string, includeFiles = true, client: DbClient = db) {
  const row = await findFolderRowById(id, client);
  if (!row) return null;
  return hydrateFolder(row, { files: includeFiles, children: true, parent: true, counts: true }, client);
}

export async function getPublicFolderDetails(identifier: string, client: DbClient = db) {
  const row = await findFolderByIdentifier(identifier, client);
  if (!row) return null;
  return hydrateFolder(
    row,
    {
      children: true,
      publicChildrenOnly: true,
      childrenCounts: true,
      parent: true,
      publicParentOnly: true,
    },
    client,
  );
}

export async function createFolderWithFiles(data: FolderInsert, fileIds: string[] = []) {
  return db.transaction(async (tx) => {
    const rows = await tx.insert(folders).values(data).returning();
    const row = rows[0];
    if (!row) throw new Error('Folder insert did not return a row');
    if (fileIds.length) await updateFilesByIds(fileIds, { folderId: row.id }, data.userId, tx);
    return hydrateFolder(row, { files: true, parent: true, counts: true }, tx);
  });
}

export async function updateFolder(id: string, data: FolderUpdate, client: DbClient = db) {
  const rows = await client.update(folders).set(data).where(eq(folders.id, id)).returning();
  return rows[0] ? hydrateFolder(rows[0], { parent: true, counts: true }, client) : null;
}

export async function moveFileToFolder(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ folderId })
    .where(eq(files.id, fileId))
    .returning({ id: files.id });
  if (!rows[0]) return null;
  const folder = await findFolderRowById(folderId, client);
  return folder ? hydrateFolder(folder, { parent: true, counts: true }, client) : null;
}

export async function removeFileFromFolder(fileId: string, folderId: string, client: DbClient = db) {
  const rows = await client
    .update(files)
    .set({ folderId: null })
    .where(and(eq(files.id, fileId), eq(files.folderId, folderId)))
    .returning({ id: files.id });
  if (!rows[0]) return null;
  const folder = await findFolderRowById(folderId, client);
  return folder ? hydrateFolder(folder, { parent: true, counts: true }, client) : null;
}

export async function buildParentChain(
  parentId: string | null,
  client: DbClient = db,
): Promise<FolderParent | null> {
  const parent = await parentSummary(parentId, false, client);
  if (!parent) return null;
  return {
    id: parent.id,
    name: parent.name,
    parentId: parent.parentId,
    parent: await buildParentChain(parent.parentId, client),
  };
}

export async function buildPublicParentChain(
  parentId: string | null,
  client: DbClient = db,
): Promise<FolderParentPublic | null> {
  const parent = await parentSummary(parentId, true, client);
  if (!parent) return null;
  return {
    ...parent,
    parent: await buildPublicParentChain(parent.parentId, client),
  };
}

export async function folderParentStatus(folderId: string, parentId: string, userId: string) {
  if (folderId === parentId) return 'cycle' as const;
  const parent = await findFolderRowById(parentId);
  if (!parent) return 'missing' as const;
  if (parent.userId !== userId) return 'foreign' as const;

  const seen = new Set<string>([parent.id]);
  let current = parent.parentId;
  while (current) {
    if (current === folderId) return 'cycle' as const;
    if (seen.has(current)) return 'cycle' as const;
    seen.add(current);
    const row = await findFolderRowById(current);
    current = row?.parentId ?? null;
  }
  return 'ok' as const;
}

export type FolderTree = {
  id: string;
  name: string;
  files: { id: string; name: string }[];
  children: FolderTree[];
};

export async function getOwnedFolderTree(
  folderId: string,
  userId: string,
  client: DbClient = db,
): Promise<FolderTree | null> {
  const folder = await findOwnedFolderById(folderId, userId, client);
  if (!folder) return null;
  const fileRows = await client
    .select({ id: files.id, name: files.name })
    .from(files)
    .where(eq(files.folderId, folderId));
  const childRows = await client
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.parentId, folderId), eq(folders.userId, userId)))
    .orderBy(asc(folders.createdAt));
  const children: FolderTree[] = [];
  for (const child of childRows) {
    const tree = await getOwnedFolderTree(child.id, userId, client);
    if (tree) children.push(tree);
  }
  return { id: folder.id, name: folder.name, files: fileRows, children };
}

export async function deleteFolderWithChildren(
  folderId: string,
  action?: 'root' | 'folder' | 'cascade' | 'cascade-files',
  targetFolderId?: string,
) {
  return db.transaction(async (tx) => {
    const fileNames: string[] = [];

    if (action === 'root') {
      await tx.update(folders).set({ parentId: null }).where(eq(folders.parentId, folderId));
      await tx.update(files).set({ folderId: null }).where(eq(files.folderId, folderId));
    } else if (action === 'folder' && targetFolderId) {
      await tx.update(folders).set({ parentId: targetFolderId }).where(eq(folders.parentId, folderId));
      await tx.update(files).set({ folderId: targetFolderId }).where(eq(files.folderId, folderId));
    } else if (action === 'cascade' || action === 'cascade-files') {
      const deleteFiles = action === 'cascade-files';
      const recursive = async (id: string): Promise<void> => {
        const childRows = await tx.select({ id: folders.id }).from(folders).where(eq(folders.parentId, id));
        for (const child of childRows) await recursive(child.id);
        if (deleteFiles) {
          const fileRows = await tx
            .select({ id: files.id, name: files.name })
            .from(files)
            .where(eq(files.folderId, id));
          fileNames.push(...fileRows.map((file) => file.name));
          if (fileRows.length)
            await tx.delete(files).where(
              inArray(
                files.id,
                fileRows.map((file) => file.id),
              ),
            );
        }
        await tx.delete(folders).where(eq(folders.id, id));
      };
      await recursive(folderId);
      return { success: true, isCascade: true, fileNames };
    }

    const deleted = await tx.delete(folders).where(eq(folders.id, folderId)).returning({ id: folders.id });
    return { success: deleted.length > 0, isCascade: false, fileNames };
  });
}

type CleanableFolder = {
  createdAt?: string | Date;
  updatedAt?: string | Date;
  files?: unknown;
  children?: unknown;
  parent?: unknown;
  [key: string]: unknown;
};

export function cleanFolder<T extends CleanableFolder>(folder: T, stringifyDates = false): T {
  if (folder.files && Array.isArray(folder.files)) cleanFiles(folder.files as any, stringifyDates);
  if (stringifyDates) {
    if (folder.createdAt instanceof Date) folder.createdAt = folder.createdAt.toISOString();
    if (folder.updatedAt instanceof Date) folder.updatedAt = folder.updatedAt.toISOString();
  }
  if (Array.isArray(folder.children)) {
    for (const child of folder.children)
      if (child && typeof child === 'object') cleanFolder(child as CleanableFolder, stringifyDates);
  }
  if (folder.parent && typeof folder.parent === 'object')
    cleanFolder(folder.parent as CleanableFolder, stringifyDates);
  return folder;
}

export function cleanFolders<T extends CleanableFolder>(rows: T[], stringifyDates = false): T[] {
  for (const row of rows) cleanFolder(row, stringifyDates);
  return rows;
}

export const folderSchema = z.object({
  id: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  name: z.string(),
  public: z.boolean(),
  allowUploads: z.boolean(),
  parentId: z.string().nullable(),
  userId: z.string(),
  files: z.array(fileSchema).optional(),
  parent: z.any().nullable().optional(),
  children: z.array(z.any()).optional(),
  _count: z.object({ children: z.number().optional(), files: z.number().optional() }).optional(),
});

export type Folder = z.infer<typeof folderSchema>;

export const folderParentSchema: z.ZodType<FolderParent> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    parentId: z.string().nullable(),
    parent: folderParentSchema.nullable().optional(),
  }),
);
export const folderParentPublicSchema: z.ZodType<FolderParentPublic> = z.lazy(() =>
  z.object({
    public: z.boolean(),
    id: z.string(),
    name: z.string(),
    parentId: z.string().nullable(),
    parent: folderParentPublicSchema.nullable().optional(),
  }),
);
