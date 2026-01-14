import type { Folder as PrismaFolder } from '@/prisma/client';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanFolder(folder: any, stringifyDates = false): any {
  if (folder.files) cleanFiles(folder.files, stringifyDates);

  if (folder.createdAt)
    folder.createdAt = stringifyDates ? folder.createdAt.toISOString() : folder.createdAt;
  if (folder.updatedAt)
    folder.updatedAt = stringifyDates ? folder.updatedAt.toISOString() : folder.updatedAt;

  if (folder.children) {
    for (const child of folder.children) {
      cleanFolder(child, stringifyDates);
    }
  }

  if (folder.parent) {
    cleanFolder(folder.parent, stringifyDates);
  }

  return folder;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanFolders(folders: any[], stringifyDates = false): any[] {
  for (let i = 0; i !== folders.length; ++i) {
    cleanFolder(folders[i], stringifyDates);
  }

  return folders;
}
