import { useConfig } from '@/components/ConfigProvider';
import Stat from '@/components/Stat';
import type { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import useLogin from '@/lib/hooks/useLogin';
import { isAdministrator } from '@/lib/role';
import { Button, Group, Paper, ScrollArea, SimpleGrid, Skeleton, Table, Text, Title } from '@mantine/core';
import {
  IconDeviceSdCard,
  IconEyeFilled,
  IconFiles,
  IconGraphFilled,
  IconLink,
  IconStarFilled,
} from '@tabler/icons-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';

const DashboardFile = lazy(() => import('@/components/file/DashboardFile'));

export default function DashboardHome() {
  const { user } = useLogin();
  const { data: recent, isLoading: recentLoading } = useSWR<Response['/api/user/recent']>('/api/user/recent');
  const { data: stats, isLoading: statsLoading } = useSWR<Response['/api/user/stats']>('/api/user/stats');

  const config = useConfig();

  return (
    <>
      <Title>
        Welcome back, <b>{user?.username}</b>
      </Title>

      <Skeleton visible={statsLoading} animate>
        <Text size='sm' c='dimmed'>
          You have <b>{statsLoading ? '...' : stats?.filesUploaded}</b> files uploaded.
        </Text>
      </Skeleton>

      {user?.quota && (user.quota.maxBytes || user.quota.maxFiles) ? (
        <Text size='sm' c='dimmed'>
          {user.quota.filesQuota === 'BY_BYTES' ? (
            <>
              You have used <b>{statsLoading ? '...' : bytes(stats!.storageUsed)}</b> out of{' '}
              <b>{user.quota.maxBytes}</b> of storage
            </>
          ) : (
            <>
              You have uploaded <b>{statsLoading ? '...' : stats?.filesUploaded}</b> files out of{' '}
              <b>{user.quota.maxFiles}</b> files allowed.
            </>
          )}
        </Text>
      ) : null}
      {user?.quota && user.quota.maxUrls ? (
        <Text size='sm' c='dimmed'>
          You have created <b>{statsLoading ? '...' : stats?.urlsCreated}</b> links out of{' '}
          <b>{user.quota.maxUrls}</b> links allowed.
        </Text>
      ) : null}

      <Group mt='md' mb='xs' style={{ alignItems: 'center' }}>
        <Title order={2}>Recent files</Title>
        <Button
          variant='outline'
          size='compact-xs'
          component={Link}
          to='/dashboard/files'
          leftSection={<IconFiles size='1rem' />}
        >
          View all files
        </Button>
      </Group>

      {recentLoading ? (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 'sm', md: 'md' }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} height={350} animate />
          ))}
        </SimpleGrid>
      ) : recent?.length !== 0 ? (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 'sm', md: 'md' }}>
          {recent!.map((file, i) => (
            <Suspense fallback={<Skeleton height={350} animate />} key={i}>
              <DashboardFile file={file} />
            </Suspense>
          ))}
        </SimpleGrid>
      ) : (
        <Text size='sm' c='dimmed'>
          You have no recent files. The last three files you uploaded will appear here.
        </Text>
      )}

      <Group mt='md' style={{ alignItems: 'center' }}>
        <Title order={2}>Stats</Title>
        {(!config.features?.metrics?.adminOnly || isAdministrator(user?.role)) && (
          <Button
            variant='outline'
            size='compact-xs'
            component={Link}
            to='/dashboard/metrics'
            leftSection={<IconGraphFilled size='1rem' />}
          >
            View instance metrics
          </Button>
        )}
      </Group>

      <Text size='sm' c='dimmed' mb='xs'>
        These statistics are based on your uploads only.
      </Text>

      {statsLoading ? (
        <>
          <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing={{ base: 'sm', md: 'md' }}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} height={105} />
            ))}
          </SimpleGrid>

          <Title order={3} mt='lg' mb='xs'>
            File types
          </Title>

          <Paper radius='sm' withBorder>
            <ScrollArea.Autosize mah={400} type='auto'>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>File Type</Table.Th>
                    <Table.Th>Count</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {[...Array(5)].map((_, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <Skeleton animate>
                          <Text>...</Text>
                        </Skeleton>
                      </Table.Td>
                      <Table.Td>
                        <Skeleton animate>
                          <Text>...</Text>
                        </Skeleton>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </Paper>
        </>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing={{ base: 'sm', md: 'md' }}>
            <Stat Icon={IconFiles} title='Files uploaded' value={stats!.filesUploaded} />
            <Stat Icon={IconStarFilled} title='Favorite files' value={stats!.favoriteFiles} />
            <Stat Icon={IconDeviceSdCard} title='Storage used' value={bytes(stats!.storageUsed)} />
            <Stat Icon={IconDeviceSdCard} title='Average storage used' value={bytes(stats!.avgStorageUsed)} />
            <Stat Icon={IconEyeFilled} title='File views' value={stats!.views} />
            <Stat Icon={IconEyeFilled} title='Average file views' value={Math.round(stats!.avgViews)} />

            <Stat Icon={IconLink} title='Links created' value={stats!.urlsCreated} />
            <Stat Icon={IconLink} title='Total link views' value={Math.round(stats!.urlViews)} />
          </SimpleGrid>

          {Object.keys(stats!.sortTypeCount).length !== 0 && (
            <>
              <Title order={3} mt='lg' mb='xs'>
                File types
              </Title>
              <Paper radius='sm' withBorder>
                <ScrollArea.Autosize mah={400} type='auto'>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>File Type</Table.Th>
                        <Table.Th>Count</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {Object.entries(stats!.sortTypeCount)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count], i) => (
                          <Table.Tr key={i}>
                            <Table.Td>{type}</Table.Td>
                            <Table.Td>{count}</Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Paper>
            </>
          )}
        </>
      )}
    </>
  );
}
