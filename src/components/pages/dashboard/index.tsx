import Stat from '@/components/Stat';
import type { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import useLogin from '@/lib/hooks/useLogin';
import { Paper, ScrollArea, SimpleGrid, Skeleton, Table, Text, Title } from '@mantine/core';
import { IconDeviceSdCard, IconEyeFilled, IconFiles, IconLink, IconStarFilled } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';

const _DashboardFile = dynamic(() => import('@/components/file/DashboardFile'), {
  loading: () => <Skeleton height={350} animate />,
});

export default function DashboardHome() {
  const { user } = useLogin();
  const { data: _recent, isLoading: _recentLoading } =
    useSWR<Response['/api/user/recent']>('/api/user/recent');
  const { data: stats, isLoading: statsLoading } = useSWR<Response['/api/user/stats']>('/api/user/stats');

  return (
    <>
      <Title>
        Welcome back, <b>{user?.username}</b>
      </Title>

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

      <Title order={2} mt='md'>
        Stats
      </Title>
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
