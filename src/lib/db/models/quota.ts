import { userQuotas } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-zod';

export const userQuotaSchema = createSelectSchema(userQuotas);
