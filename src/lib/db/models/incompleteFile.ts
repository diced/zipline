import { incompleteFiles, type IncompleteFileMetadata } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

const metadataSchema = z.object({
  file: z.object({
    filename: z.string(),
    type: z.string(),
    id: z.string(),
  }),
}) satisfies z.ZodType<IncompleteFileMetadata>;

export const incompleteFileSchema = createSelectSchema(incompleteFiles, { metadata: metadataSchema });

export type IncompleteFile = z.infer<typeof incompleteFileSchema>;
