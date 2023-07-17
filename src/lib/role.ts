import type { Role } from '@prisma/client';

export function isAdministrator(role?: Role) {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export function canInteract(current?: Role, target?: Role) {
  return (
    (current === 'SUPERADMIN' && (target === 'USER' || target === 'ADMIN')) ||
    (current === 'ADMIN' && target === 'USER')
  );
}

export function roleName(role?: Role) {
  switch (role) {
    case 'USER':
      return 'User';
    case 'ADMIN':
      return 'Admin';
    case 'SUPERADMIN':
      return 'Super Admin';
    default:
      return 'User';
  }
}
