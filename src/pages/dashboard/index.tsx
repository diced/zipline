import DashboardFile from '@/components/DashboardFile';
import Layout from '@/components/Layout';
import Stat from '@/components/Stat';
import { Response } from '@/lib/api/response';
import useLogin from '@/lib/hooks/useLogin';
import { Card, Group, LoadingOverlay, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconFiles } from '@tabler/icons-react';
import bytes from 'bytes';
import useSWR from 'swr';

export default function DashboardIndex() {
  const { user, loading } = useLogin();

  const { data: recent, isLoading: recentLoading } = useSWR<Response['/api/user/recent']>('/api/user/recent');
  const { data: stats, isLoading: statsLoading } = useSWR<Response['/api/user/stats']>('/api/user/stats');

  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout>
      <Title order={1}>
        Welcome back, <b>{user?.username}</b>
      </Title>
      <Text size='sm' color='dimmed'>
        You have <b>{statsLoading ? '...' : stats?.filesUploaded}</b> files uploaded.
      </Text>

      <Title order={2} mt='md' mb='xs'>
        Recent files
      </Title>

      {recentLoading ? (
        <Paper withBorder p='md' radius='md' pos='relative' h={300}>
          <LoadingOverlay visible />
        </Paper>
      ) : (
        <SimpleGrid cols={3} spacing='md' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
          {recent!.map((file) => (
            <DashboardFile key={file.id} file={file} />
          ))}
        </SimpleGrid>
      )}

      <Title order={2} mt='md'>
        Stats
      </Title>
      <Text size='sm' color='dimmed' mb='xs'>
        These statistics are based on your uploads only.
      </Text>

      {statsLoading ? (
        <Paper withBorder p='md' radius='md' pos='relative' h={300}>
          <LoadingOverlay visible />
        </Paper>
      ) : (
        <SimpleGrid cols={4} spacing='md' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
          <Stat
            Icon={IconFiles}
            title='Storage used'
            value={bytes(stats!.storageUsed, { unitSeparator: ' ' })}
          />
          <Stat
            Icon={IconFiles}
            title='Average storage used'
            value={bytes(stats!.avgStorageUsed, { unitSeparator: ' ' })}
          />
          <Stat Icon={IconFiles} title='Views' value={stats!.views} />
          <Stat Icon={IconFiles} title='Average views' value={stats!.avgViews} />
        </SimpleGrid>
      )}
    </Layout>
  );
}
