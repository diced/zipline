import type { Role } from '@/prisma/client';

type RoleIdentity = {
  id: string;
  role: Role;
};

export function isAdministrator(role?: Role) {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export function canInteract(current?: Role, target?: Role) {
  return (
    (current === 'SUPERADMIN' && (target === 'USER' || target === 'ADMIN')) ||
    (current === 'ADMIN' && target === 'USER')
  );
}

export function canManage(current?: RoleIdentity | null, target?: RoleIdentity | null) {
  if (!current || !target) return false;

  return current.id === target.id || canInteract(current.role, target.role);
}

export function interactableRoles(current?: Role): Role[] {
  if (current === 'SUPERADMIN') return ['USER', 'ADMIN'];
  if (current === 'ADMIN') return ['USER'];
  return [];
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
