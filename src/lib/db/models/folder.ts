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

export type FolderParent = {
  id: string;
  name: string;
  parentId: string | null;
  parent?: FolderParent | null;
};

export type FolderParentPublic = {
  public: boolean;
} & FolderParent;

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

export function cleanFolder(folder: Partial<Folder>, stringifyDates = false): Partial<Folder> {
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

export function cleanFolders(folders: Partial<Folder>[], stringifyDates = false): Partial<Folder>[] {
  for (let i = 0; i !== folders.length; ++i) {
    cleanFolder(folders[i], stringifyDates);
  }

  return folders;
}
