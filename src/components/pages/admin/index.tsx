import { useConfig } from '@/components/ConfigProvider';
import { LinksList } from '@/components/LinksList';
import useLogin from '@/lib/client/hooks/useLogin';
import { isAdministrator } from '@/lib/role';
import { SimpleGrid, Title } from '@mantine/core';
import { IconAdjustments, IconGraph, IconStopwatch, IconTags, IconUsersGroup } from '@tabler/icons-react';
import { Version } from './parts/Version';
import { Storage } from './parts/Storage';

export default function DashboardAdminHome() {
  const { user } = useLogin();
  const config = useConfig();

  const adminLinks = [
    {
      label: 'Metrics',
      description: 'Instance-wide usage graphs and statistics',
      href: '/dashboard/metrics',
      icon: IconGraph,
      show:
        config.features.metrics.enabled &&
        (!config.features.metrics.adminOnly || isAdministrator(user?.role)),
    },
    {
      label: 'Actions',
      description: 'Maintenance tools and import/export',
      href: '/dashboard/admin/actions',
      icon: IconStopwatch,
      show: true,
    },
    {
      label: 'Users',
      description: 'Manage users and quotas',
      href: '/dashboard/admin/users',
      icon: IconUsersGroup,
      show: true,
    },
    {
      label: 'Settings',
      description: 'Server configuration',
      href: '/dashboard/admin/settings',
      icon: IconAdjustments,
      show: user?.role === 'SUPERADMIN',
    },
    {
      label: 'Invites',
      description: 'Create and manage invite codes',
      href: '/dashboard/admin/invites',
      icon: IconTags,
      show: config.invites.enabled,
    },
  ];

  return (
    <>
      <Title order={1}>Administrator</Title>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing='md' my='md'>
        <Storage />
        <Version />
      </SimpleGrid>

      <LinksList links={adminLinks} />
    </>
  );
}
