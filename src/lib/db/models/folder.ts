import type { Folder as PrismaFolder } from '@/prisma/client';
import { prisma } from '@/lib/db';
import { File, cleanFiles } from './file';

export type Folder = PrismaFolder & {
  files?: File[];
  parent?: Partial<PrismaFolder> | null;
  children?: Partial<Folder>[];
  _count?: {
    children?: number;
    files?: number;
  };
};

export interface FolderParent {
  id: string;
  name: string;
  parentId: string | null;
  parent?: FolderParent | null;
}

export interface FolderParentPublic extends FolderParent {
  public: boolean;
}

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

export function cleanFolder<T extends Record<string, unknown>>(folder: T, stringifyDates = false): T {
  if (folder.files && Array.isArray(folder.files)) cleanFiles(folder.files as any, stringifyDates);

  if (folder.createdAt)
    (folder.createdAt as unknown) = stringifyDates
      ? (folder.createdAt as Date).toISOString()
      : folder.createdAt;
  if (folder.updatedAt)
    (folder.updatedAt as unknown) = stringifyDates
      ? (folder.updatedAt as Date).toISOString()
      : folder.updatedAt;

  if (folder.children && Array.isArray(folder.children)) {
    for (const child of folder.children) {
      cleanFolder(child as Record<string, unknown>, stringifyDates);
    }
  }

  if (folder.parent && typeof folder.parent === 'object') {
    cleanFolder(folder.parent as Record<string, unknown>, stringifyDates);
  }

  return folder;
}

export function cleanFolders<T extends Record<string, unknown>>(folders: T[], stringifyDates = false): T[] {
  for (let i = 0; i !== folders.length; ++i) {
    cleanFolder(folders[i], stringifyDates);
  }

  return folders;
}
