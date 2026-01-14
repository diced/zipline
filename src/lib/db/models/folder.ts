import type { Folder as PrismaFolder } from '@/prisma/client';
import { File, cleanFiles } from './file';

export type Folder = PrismaFolder & {
  files?: File[];
  parent?: Folder | null;
  children?: Folder[];
  _count?: {
    children?: number;
    files?: number;
  };
};

export function cleanFolder(folder: Partial<Folder>, stringifyDates = false): Partial<Folder> {
  if (folder.files) cleanFiles(folder.files, stringifyDates);

  if (folder.createdAt)
    (folder as any).createdAt = stringifyDates ? folder.createdAt.toISOString() : folder.createdAt;
  if (folder.updatedAt)
    (folder as any).updatedAt = stringifyDates ? folder.updatedAt.toISOString() : folder.updatedAt;

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

export function cleanFolders(folders: Folder[], stringifyDates = false): Folder[] {
  for (let i = 0; i !== folders.length; ++i) {
    cleanFolder(folders[i], stringifyDates);
  }

  return folders;
}
