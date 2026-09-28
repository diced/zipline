import { useConfig } from '@/components/ConfigProvider';
import { LinksList } from '@/components/LinksList';
import useLogin from '@/lib/client/hooks/useLogin';
import { isAdministrator } from '@/lib/role';
import { SimpleGrid, Title } from '@mantine/core';
import { IconAdjustments, IconGraph, IconStopwatch, IconTags, IconUsersGroup } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Version } from './parts/Version';
import { Storage } from './parts/Storage';

export default function DashboardAdminHome() {
  const { user } = useLogin();
  const config = useConfig();
  const { t } = useTranslation('serverActions');

  const adminLinks = [
    {
      label: t('admin.links.metrics.label'),
      description: t('admin.links.metrics.description'),
      href: '/dashboard/metrics',
      icon: IconGraph,
      show:
        config.features.metrics.enabled &&
        (!config.features.metrics.adminOnly || isAdministrator(user?.role)),
    },
    {
      label: t('admin.links.actions.label'),
      description: t('admin.links.actions.description'),
      href: '/dashboard/admin/actions',
      icon: IconStopwatch,
      show: true,
    },
    {
      label: t('admin.links.users.label'),
      description: t('admin.links.users.description'),
      href: '/dashboard/admin/users',
      icon: IconUsersGroup,
      show: true,
    },
    {
      label: t('admin.links.settings.label'),
      description: t('admin.links.settings.description'),
      href: '/dashboard/admin/settings',
      icon: IconAdjustments,
      show: user?.role === 'SUPERADMIN',
    },
    {
      label: t('admin.links.invites.label'),
      description: t('admin.links.invites.description'),
      href: '/dashboard/admin/invites',
      icon: IconTags,
      show: config.invites.enabled,
    },
  ];

  return (
    <>
      <Title order={1}>{t('admin.title')}</Title>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing='md' my='md'>
        <Storage />
        <Version />
      </SimpleGrid>

      <LinksList links={adminLinks} />
    </>
  );
}
