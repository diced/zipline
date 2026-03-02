import { Role } from '@/prisma/client';
import { z } from 'zod';

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
      role: z.enum(Role),
    })
    .optional(),
});

export type Invite = z.infer<typeof inviteSchema>;
