import { config } from '@/lib/config';
import { formatRootUrl } from '@/lib/url';
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
  thumbnail: {
    select: {
      path: true,
    },
  },
  tags: {
    select: tagSelectNoFiles,
  },
};

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
      (file as any).createdAt = file.createdAt.toISOString();
      (file as any).updatedAt = file.updatedAt.toISOString();
      (file as any).deletesAt = file.deletesAt?.toISOString() || null;
    }

    file.url = formatRootUrl(config.files.route, file.name);
  }

  return files;
}

export const fileSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  deletesAt: z.date().nullable(),
  favorite: z.boolean(),
  id: z.string(),
  originalName: z.string().nullable(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  views: z.number(),
  maxViews: z.number().nullable().optional(),
  password: z.union([z.string(), z.boolean()]).nullable().optional(),
  folderId: z.string().nullable(),

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
