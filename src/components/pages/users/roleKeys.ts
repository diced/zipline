import type { Role } from '@/lib/db/enums';

export const ROLE_KEYS = {
  USER: 'roles.user',
  ADMIN: 'roles.admin',
  SUPERADMIN: 'roles.superAdmin',
} as const satisfies Record<Role, string>;
