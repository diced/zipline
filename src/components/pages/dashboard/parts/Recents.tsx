import { Response } from '@/lib/api/response';
import { SimpleGrid, Skeleton, Text } from '@mantine/core';
import { lazy, Suspense } from 'react';
import useSWR from 'swr';

const DashboardFile = lazy(() => import('@/components/file/DashboardFile'));

export default function Recents() {
  const { data, isLoading } = useSWR<Response['/api/user/recent']>('/api/user/recent');

  if (isLoading)
    return (
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 'sm', md: 'md' }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height={350} animate />
        ))}
      </SimpleGrid>
    );

  if (data?.length)
    return (
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 'sm', md: 'md' }}>
        {data!.map((file, i) => (
          <Suspense fallback={<Skeleton height={350} animate />} key={i}>
            <DashboardFile file={file} />
          </Suspense>
        ))}
      </SimpleGrid>
    );

  return (
    <Text size='sm' c='dimmed'>
      You have no recent files. The last three files you uploaded will appear here.
    </Text>
  );
}
