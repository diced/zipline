import { exports as exportRecords } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-zod';

export const exportSchema = createSelectSchema(exportRecords).omit({ userId: true });

export type Export = Omit<typeof exportRecords.$inferSelect, 'userId'>;
