import {
  Accordion,
  Button,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Title,
} from '@mantine/core';
import { IconFileUpload, IconFilesOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useApiPagination } from '../useApiPagination';
import { lazy, Suspense } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useViewStore } from '@/lib/client/store/view';
import { getGridCols, getGridSkeletonHeight } from '@/components/GridTableSwitcher';

const DashboardFile = lazy(() => import('@/components/file/DashboardFile'));

export default function FavoriteFiles() {
  const [page, setPage] = useQueryState('fpage', parseAsInteger.withDefault(1));
  const gridSize = useViewStore((state) => state.filesGridSize);

  const { data, isLoading } = useApiPagination({
    page,
    favorite: true,
    filter: 'dashboard',
  });

  if (!isLoading && !data?.page.length) {
    return null;
  }

  const cols = getGridCols(gridSize);
  const skeletonHeight = getGridSkeletonHeight(gridSize);

  return (
    <Accordion variant='separated' my='xs'>
      <Accordion.Item value='favorite'>
        <Accordion.Control>Favorite Files</Accordion.Control>

        <Accordion.Panel>
          <SimpleGrid
            my='sm'
            cols={{
              base: cols.base,
              md: cols.md,
              lg: cols.lg,
              xl: cols.xl,
            }}
            spacing={gridSize === 'compact' ? 'xs' : 'md'}
            pos='relative'
          >
            {isLoading ? (
              <Paper withBorder h={skeletonHeight}>
                <LoadingOverlay visible />
              </Paper>
            ) : (data?.page.length ?? 0 > 0) ? (
              data?.page.map((file) => (
                <Suspense fallback={<Skeleton height={skeletonHeight} animate />} key={file.id}>
                  <DashboardFile file={file} compact={gridSize === 'compact'} />
                </Suspense>
              ))
            ) : (
              <Paper withBorder p='sm'>
                <Center>
                  <Stack>
                    <Group>
                      <IconFilesOff size='2rem' />
                      <Title order={2}>No files found</Title>
                    </Group>
                    <Button
                      variant='outline'
                      size='compact-sm'
                      leftSection={<IconFileUpload size='1rem' />}
                      component={Link}
                      to='/dashboard/upload/file'
                    >
                      Upload a file
                    </Button>
                  </Stack>
                </Center>
              </Paper>
            )}
          </SimpleGrid>

          <Center>
            <Pagination my='sm' value={page} onChange={setPage} total={data?.pages ?? 1} />
          </Center>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
