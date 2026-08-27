import { invites, users } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

const inviterSchema = createSelectSchema(users).pick({
  username: true,
  id: true,
  role: true,
});

export const inviteSchema = createSelectSchema(invites).extend({ inviter: inviterSchema.optional() });

export type Invite = z.infer<typeof inviteSchema>;
