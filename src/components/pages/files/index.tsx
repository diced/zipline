import {
  Button,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useApiPagination } from './useApiPagination';
import DashboardFile from '@/components/file/DashboardFile';
import { useState } from 'react';
import { IconFileUpload, IconFilesOff } from '@tabler/icons-react';
import Link from 'next/link';

export default function Files() {
  const [page, setPage] = useState<number>(1);
  const { pages, pagesCount } = useApiPagination(page);

  return (
    <>
      <Title>Files</Title>

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
          pages.data?.map((file) => <DashboardFile key={file.id} file={file} />)
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
