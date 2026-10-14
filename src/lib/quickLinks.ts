import type { SafeConfig } from '@/lib/config/safe';
import type { Role } from '@/lib/db/enums';
import { isAdministrator } from '@/lib/role';

export const QUICK_LINKS = [
  { id: 'uploadFile', path: '/dashboard/upload/file' },
  { id: 'uploadText', path: '/dashboard/upload/text' },
  { id: 'files', path: '/dashboard/files' },
  { id: 'folders', path: '/dashboard/folders' },
  { id: 'urls', path: '/dashboard/urls' },
  { id: 'metrics', path: '/dashboard/metrics' },
  { id: 'settings', path: '/dashboard/settings' },
  { id: 'administrator', path: '/dashboard/admin' },
  { id: 'users', path: '/dashboard/admin/users' },
  { id: 'invites', path: '/dashboard/admin/invites' },
  { id: 'serverActions', path: '/dashboard/admin/actions' },
  { id: 'serverSettings', path: '/dashboard/admin/settings' },
] as const;

export type QuickLinkId = (typeof QUICK_LINKS)[number]['id'];

export function getAvailableQuickLinks(config: Pick<SafeConfig, 'features' | 'invites'>, role?: Role) {
  return QUICK_LINKS.filter(({ id }) => {
    switch (id) {
      case 'metrics':
        return (
          config.features.metrics.enabled && (!config.features.metrics.adminOnly || isAdministrator(role))
        );
      case 'invites':
        return config.invites.enabled && isAdministrator(role);
      case 'serverSettings':
        return role === 'SUPERADMIN';
      case 'administrator':
      case 'users':
      case 'serverActions':
        return isAdministrator(role);
      default:
        return true;
    }
  });
}
