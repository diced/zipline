import FileModal from '@/components/file/DashboardFile/FileModal';
import { copyFile, deleteFile, viewFile } from '@/components/file/actions';
import { Response } from '@/lib/api/response';
import { fileSelect, type File } from '@/lib/db/models/file';
import { ActionIcon, Box, Group, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { Prisma } from '@prisma/client';
import { IconCopy, IconExternalLink, IconFile, IconTrashFilled } from '@tabler/icons-react';
import bytes from 'bytes';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useApiPagination } from '../useApiPagination';
import RelativeDate from '@/components/RelativeDate';

const PER_PAGE_OPTIONS = [10, 20, 50];

export default function FileTable({ id }: { id?: string }) {
  const router = useRouter();
  const clipboard = useClipboard();

  const [page, setPage] = useState<number>(router.query.page ? parseInt(router.query.page as string) : 1);
  const [perpage, setPerpage] = useState<number>(20);
  const [sort, setSort] = useState<keyof Prisma.FileOrderByWithRelationInput>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data, isLoading } = useApiPagination({
    page,
    perpage,
    filter: 'all',
    sort,
    order,
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
      { shallow: true }
    );
  }, [page]);

  return (
    <>
      <FileModal
        open={!!selectedFile}
        setOpen={(open) => {
          if (!open) setSelectedFile(null);
        }}
        file={selectedFile}
      />

      <Box my='sm'>
        <DataTable
          borderRadius='sm'
          withBorder
          minHeight={200}
          records={data?.page ?? []}
          columns={[
            { accessor: 'name', sortable: true },
            { accessor: 'type', sortable: true },
            { accessor: 'size', sortable: true, render: (file) => bytes(file.size, { unitSeparator: ' ' }) },
            {
              accessor: 'createdAt',
              sortable: true,
              render: (file) => <RelativeDate date={file.createdAt} />,
            },
            {
              accessor: 'favorite',
              sortable: true,
              render: (file) => (file.favorite ? 'Yes' : 'No'),
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
          fetching={isLoading}
          totalRecords={data?.total ?? 0}
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
