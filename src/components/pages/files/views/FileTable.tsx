import { Response } from '@/lib/api/response';
import { SafeConfig } from '@/lib/config/safe';
import type { File } from '@/lib/db/models/file';
import { ActionIcon, Box, Group, Tooltip } from '@mantine/core';
import type { Prisma } from '@prisma/client';
import bytes from 'bytes';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useApiPagination } from '../useApiPagination';
import FileModal from '@/components/file/DashboardFile/FileModal';
import { useClipboard } from '@mantine/hooks';
import { IconCopy, IconExternalLink, IconFile, IconTrashFilled } from '@tabler/icons-react';
import { copyFile, deleteFile, viewFile } from '@/components/file/actions';
import { notifications } from '@mantine/notifications';
import { useConfig } from '@/components/ConfigProvider';

const PER_PAGE_OPTIONS = [10, 20, 50];

export default function FileTable() {
  const router = useRouter();
  const config = useConfig();
  const clipboard = useClipboard();

  const { data: stats, isLoading: statsLoading } = useSWR<Response['/api/user/stats']>('/api/user/stats');

  const [page, setPage] = useState<number>(router.query.page ? parseInt(router.query.page as string) : 1);
  const [perpage, setPerpage] = useState<number>(20);
  const [sort, setSort] = useState<keyof Prisma.FileOrderByWithRelationInput>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { pages } = useApiPagination({
    page,
    perpage,
    filter: 'all',
    sort,
    order,
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
      {selectedFile && (
        <FileModal
          open={!!selectedFile}
          setOpen={(open) => {
            if (!open) setSelectedFile(null);
          }}
          file={selectedFile}
        />
      )}

      <Box my='sm'>
        <DataTable
          withBorder
          minHeight={200}
          records={pages.data}
          columns={[
            { accessor: 'name', sortable: true },
            { accessor: 'type', sortable: true },
            { accessor: 'size', sortable: true, render: (file) => bytes(file.size, { unitSeparator: ' ' }) },
            {
              accessor: 'createdAt',
              sortable: true,
              render: (file) => new Date(file.createdAt).toLocaleString(),
            },
            {
              accessor: 'actions',
              textAlignment: 'right',
              width: 200,
              render: (file) => (
                <Group spacing='sm'>
                  <Tooltip label='More details'>
                    <ActionIcon variant='outline' color='gray'>
                      <IconFile size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label='View file in new tab'>
                    <ActionIcon
                      variant='outline'
                      color='gray'
                      onClick={(e) => {
                        e.stopPropagation();
                        viewFile(file);
                      }}
                    >
                      <IconExternalLink size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label='Copy file link to clipboard'>
                    <ActionIcon
                      variant='outline'
                      color='gray'
                      onClick={(e) => {
                        e.stopPropagation();
                        copyFile(file, clipboard, notifications);
                      }}
                    >
                      <IconCopy size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label='Delete file'>
                    <ActionIcon
                      variant='outline'
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file, notifications, () => {});
                      }}
                    >
                      <IconTrashFilled size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          fetching={pages.isLoading || statsLoading}
          totalRecords={stats?.filesUploaded ?? 0}
          recordsPerPage={perpage}
          onRecordsPerPageChange={setPerpage}
          recordsPerPageOptions={PER_PAGE_OPTIONS}
          page={page}
          onPageChange={setPage}
          sortStatus={{
            columnAccessor: sort,
            direction: order,
          }}
          onSortStatusChange={(data) => {
            setSort(data.columnAccessor as keyof Prisma.FileOrderByWithRelationInput);
            setOrder(data.direction);
          }}
          onCellClick={({ record }) => setSelectedFile(record)}
        />
      </Box>
    </>
  );
}
