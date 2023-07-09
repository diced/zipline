import DashboardFile from '@/components/file/DashboardFile';
import type { SafeConfig } from '@/lib/config/safe';
import {
  Button,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  SimpleGrid,
  Stack,
  Title,
} from '@mantine/core';
import { IconFileUpload, IconFilesOff } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useApiPagination } from '../useApiPagination';
import { useConfig } from '@/components/ConfigProvider';

export default function Files() {
  const router = useRouter();
  const config = useConfig();

  const [page, setPage] = useState<number>(router.query.page ? parseInt(router.query.page as string) : 1);
  const { pages, pagesCount } = useApiPagination({
    page,
  });

  useEffect(() => {
    router.replace(
      {
        query: {
          ...router.query,
          page: page,
        },
      },
      undefined,
      { shallow: true }
    );
  }, [page]);

  return (
    <>
      <SimpleGrid
        my='sm'
        cols={pages.data?.length ?? 0 > 0 ? 3 : 1}
        spacing='md'
        breakpoints={[
          { maxWidth: 'sm', cols: 1 },
          { maxWidth: 'md', cols: 2 },
        ]}
        pos='relative'
      >
        {pages.isLoading ? (
          <Paper withBorder h={200}>
            <LoadingOverlay visible />
          </Paper>
        ) : pages.data?.length ?? 0 > 0 ? (
          pages.data?.map((file) => (
            <DashboardFile
              disableMediaPreview={config.website.disableMediaPreview}
              key={file.id}
              file={file}
            />
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
                  color='gray'
                  compact
                  leftIcon={<IconFileUpload size='1rem' />}
                  component={Link}
                  href='/dashboard/upload/file'
                >
                  Upload a file
                </Button>
              </Stack>
            </Center>
          </Paper>
        )}
      </SimpleGrid>

      <Center>
        <Pagination my='sm' value={page} onChange={setPage} total={pagesCount.data?.count ?? 1} />
      </Center>
    </>
  );
}
