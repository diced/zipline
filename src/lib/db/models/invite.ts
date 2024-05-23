import type { Invite as PrismaInvite } from '@prisma/client';
import type { User } from './user';

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
