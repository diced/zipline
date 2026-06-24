import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { formatRootUrl } from '@/lib/url';
import type { Prisma } from '@/prisma/client';
import { z } from 'zod';
import { tagSchema, tagSelectNoFiles } from './tag';

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
  thumbnail: {
    select: {
      path: true,
    },
  },
  tags: {
    select: tagSelectNoFiles,
  },
};

export async function findFileByName<T extends Prisma.FileFindFirstArgs = Prisma.FileFindFirstArgs>(
  id: string,
  args?: Omit<T, 'where'>,
): Promise<Prisma.FileGetPayload<T> | null> {
  const name = decodeURIComponent(id);
  const file = await prisma.file.findFirst({ ...(args as T), where: { name } } as T);
  if (file || !config.files.extensionlessUrls || name.includes('.')) {
    return file as Prisma.FileGetPayload<T> | null;
  }
  return prisma.file.findFirst({
    ...(args as T),
    where: { name: { startsWith: `${name}.` } },
  } as T) as Prisma.FileGetPayload<T> | null;
}

export function cleanFile(file: File) {
  file.password = !!file.password;

  file.url = formatRootUrl(config.files.route, file.name);

  return file;
}

export function cleanFiles(files: File[], stringifyDates = false) {
  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    if (file.password) file.password = true;

    if (stringifyDates) {
      if (file.createdAt instanceof Date) file.createdAt = file.createdAt.toISOString();
      if (file.updatedAt instanceof Date) file.updatedAt = file.updatedAt.toISOString();
      if (file.deletesAt && file.deletesAt instanceof Date) file.deletesAt = file.deletesAt.toISOString();
    }

    file.url = formatRootUrl(config.files.route, file.name);
  }

  return files;
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

  thumbnail: z
    .object({
      path: z.string(),
    })
    .nullable(),

  tags: z.array(tagSchema).optional(),

  url: z.string().optional(),
  similarity: z.number().optional(),
});

export type File = z.infer<typeof fileSchema>;
