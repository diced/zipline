import { userQuotas } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';

export const userQuotaSchema = createSelectSchema(userQuotas);
