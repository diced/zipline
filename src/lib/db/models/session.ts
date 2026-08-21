import { userSessions } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';

export const userSessionSchema = createSelectSchema(userSessions);
export type UserSession = typeof userSessions.$inferSelect;
