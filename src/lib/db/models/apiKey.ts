import { apiKeyScopeSchema } from '@/lib/apiKey';
import { apiKeys } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const apiKeySchema = createSelectSchema(apiKeys, {
  scopes: z.array(apiKeyScopeSchema),
}).omit({ secretHash: true, userId: true });

export type ApiKey = z.infer<typeof apiKeySchema>;
