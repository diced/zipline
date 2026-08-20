import { incompleteFiles } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export { IncompleteFileStatus } from '@/lib/db/enums';
export type { IncompleteFileStatus as IncompleteFileStatusValue } from '@/lib/db/enums';

type IncompleteFileMetadata = z.infer<typeof metadataSchema>;
const metadataSchema = z.object({
  file: z.object({
    filename: z.string(),
    type: z.string(),
    id: z.string(),
  }),
});

export const incompleteFileSchema = createSelectSchema(incompleteFiles, { metadata: metadataSchema });

export type IncompleteFile = z.infer<typeof incompleteFileSchema>;
export type IncompleteFileInsert = Omit<typeof incompleteFiles.$inferInsert, 'metadata'> & {
  metadata: IncompleteFileMetadata;
};
