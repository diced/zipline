import { urls } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const urlSchema = createSelectSchema(urls, { password: z.boolean() }).extend({
  similarity: z.number().optional(),
});

export type Url = z.infer<typeof urlSchema>;
