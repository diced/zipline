import type { Url as PrismaUrl } from '@/prisma/client';
import { z } from 'zod';

export type Url = PrismaUrl & {
  similarity?: number;
};

export function cleanUrlPasswords(urls: Url[]) {
  for (const url of urls) {
    (url as any).password = !!url.password;
  }

  return urls;
}

export const urlSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  code: z.string(),
  vanity: z.string().nullable(),
  destination: z.string(),
  views: z.number(),
  maxViews: z.number().nullable(),
  password: z.string().nullable(),
  enabled: z.boolean(),

  userId: z.string().nullable(),

  similarity: z.number().optional(),
});
