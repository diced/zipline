import { prisma } from '@/lib/db';
import { z } from 'zod';
import { fileSchema, cleanFiles } from './file';

export async function buildParentChain(parentId: string | null): Promise<FolderParent | null> {
  if (!parentId) return null;

  const parent = await prisma.folder.findUnique({
    where: { id: parentId },
    select: { id: true, name: true, parentId: true },
  });

  if (!parent) return null;

  const grandparent = await buildParentChain(parent.parentId);

  return {
    ...parent,
    parent: grandparent,
  };
}

export async function buildPublicParentChain(parentId: string | null): Promise<FolderParentPublic | null> {
  if (!parentId) return null;

  const parent = await prisma.folder.findUnique({
    where: { id: parentId },
    select: { id: true, name: true, public: true, parentId: true },
  });

  if (!parent || !parent.public) return null;

  const grandparent = await buildPublicParentChain(parent.parentId);

  return {
    ...parent,
    parent: grandparent,
  };
}

export function cleanFolder<T extends Partial<Folder>>(folder: T, stringifyDates = false): T {
  if (folder.files && Array.isArray(folder.files)) cleanFiles(folder.files as any, stringifyDates);

  if (stringifyDates) {
    if (folder.createdAt) (folder.createdAt as unknown) = (folder.createdAt as Date).toISOString();
    if (folder.updatedAt) (folder.updatedAt as unknown) = (folder.updatedAt as Date).toISOString();
  }

  if (folder.children && Array.isArray(folder.children)) {
    for (const child of folder.children) {
      cleanFolder(child, stringifyDates);
    }
  }

  if (folder.parent && typeof folder.parent === 'object') {
    cleanFolder(folder.parent, stringifyDates);
  }

  return folder;
}

export function cleanFolders<T extends Partial<Folder>>(folders: T[], stringifyDates = false): T[] {
  for (let i = 0; i !== folders.length; ++i) {
    cleanFolder(folders[i], stringifyDates);
  }

  return folders;
}

export const folderSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  name: z.string(),
  public: z.boolean(),
  allowUploads: z.boolean(),

  parentId: z.string().nullable(),
  userId: z.string(),

  files: z.array(fileSchema).optional(),
  parent: z.any().nullable().optional(),
  children: z.array(z.any()).optional(),
  _count: z
    .object({
      children: z.number().optional(),
      files: z.number().optional(),
    })
    .optional(),
});

export type Folder = z.infer<typeof folderSchema>;

export const folderParentSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  get parent() {
    return folderParentSchema.nullable().optional();
  },
});

export const folderParentPublicSchema = z.object({
  public: z.boolean(),
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  get parent() {
    return folderParentPublicSchema.nullable().optional();
  },
});

export type FolderParent = z.infer<typeof folderParentSchema>;
export type FolderParentPublic = z.infer<typeof folderParentPublicSchema>;
