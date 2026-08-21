import { files, tags } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const tagColumns = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
} as const;

const tagFileSchema = createSelectSchema(files).pick({ id: true });

export const tagSchema = createSelectSchema(tags)
  .omit({ userId: true })
  .extend({
    files: z.array(tagFileSchema).optional(),
  });

export type Tag = z.infer<typeof tagSchema>;
