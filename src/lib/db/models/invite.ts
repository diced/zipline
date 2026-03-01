import type { Invite as PrismaInvite } from '@/prisma/client';
import type { User } from './user';
import { z } from 'zod';

export type Invite = PrismaInvite & {
  inviter?: {
    username: string;
    id: string;
    role: User['role'];
  };
};

export const inviteInviterSelect = {
  select: {
    username: true,
    id: true,
    role: true,
  },
};

export const inviteSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().nullable(),

  code: z.string(),
  uses: z.number(),
  maxUses: z.number().nullable(),

  inviterId: z.string(),

  inviter: z
    .object({
      username: z.string(),
      id: z.string(),
      role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']),
    })
    .optional(),
});
