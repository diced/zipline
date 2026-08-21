import { exports as exportRecords } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const exportSchema = createSelectSchema(exportRecords).omit({ userId: true });

export type Export = z.infer<typeof exportSchema>;
