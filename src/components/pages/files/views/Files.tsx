import DashboardFile from '@/components/file/DashboardFile';
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

export default function Files({ id }: { id?: string }) {
  const router = useRouter();

  const [page, setPage] = useState<number>(router.query.page ? parseInt(router.query.page as string) : 1);
  const { data, isLoading } = useApiPagination({
    page,
    id,
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
      { shallow: true },
    );
  }, [page]);

  return (
    <>
      <SimpleGrid
        my='sm'
        cols={{
          base: 1,
          md: 2,
          lg: data?.page.length ?? 0 > 0 ? 3 : 1,
        }}
        spacing='md'
        pos='relative'
      >
        {isLoading ? (
          <Paper withBorder h={200}>
            <LoadingOverlay visible />
          </Paper>
        ) : data?.page?.length ?? 0 > 0 ? (
          data?.page.map((file) => <DashboardFile key={file.id} file={file} />)
        ) : (
          <Paper withBorder p='sm'>
            <Center>
              <Stack>
                <Group>
                  <IconFilesOff size='2rem' />
                  <Title order={2}>No files found</Title>
                </Group>
                {!id && (
                  <Button
                    variant='outline'
                    size='compact-sm'
                    leftSection={<IconFileUpload size='1rem' />}
                    component={Link}
                    href='/dashboard/upload/file'
                  >
                    Upload a file
                  </Button>
                )}
              </Stack>
            </Center>
          </Paper>
        )}
      </SimpleGrid>

      <Center>
        <Pagination my='sm' value={page} onChange={setPage} total={data?.pages ?? 1} />
      </Center>
    </>
  );
}
