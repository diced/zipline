import RelativeDate from '@/components/RelativeDate';
import FileModal from '@/components/file/DashboardFile/FileModal';
import { copyFile, deleteFile, viewFile } from '@/components/file/actions';
import { type File } from '@/lib/db/models/file';
import { ActionIcon, Box, Button, Group, Paper, Text, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { Prisma } from '@prisma/client';
import { IconCopy, IconExternalLink, IconFile, IconStar, IconTrashFilled } from '@tabler/icons-react';
import bytes from 'bytes';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { bulkDelete, bulkFavorite } from '../bulk';
import { useApiPagination } from '../useApiPagination';

const PER_PAGE_OPTIONS = [10, 20, 50];

export default function FileTable({ id }: { id?: string }) {
  const router = useRouter();
  const clipboard = useClipboard();

  const [page, setPage] = useState<number>(router.query.page ? parseInt(router.query.page as string) : 1);
  const [perpage, setPerpage] = useState<number>(20);
  const [sort, setSort] = useState<keyof Prisma.FileOrderByWithRelationInput>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  useEffect(() => {
    if (data && selectedFile) {
      const file = data.page.find((x) => x.id === selectedFile.id);

      if (file) {
        setSelectedFile(file);
      }
    }
  }, [data]);

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
        {selectedFiles.length > 0 && (
          <Paper withBorder p='sm' my='sm'>
            <Title order={3}>Operations</Title>

            <Text size='sm' color='dimmed' mb='xs'>
              Selections are saved across page changes
            </Text>

            <Group>
              <Button
                variant='outline'
                color='red'
                leftIcon={<IconTrashFilled size='1rem' />}
                onClick={() =>
                  bulkDelete(
                    selectedFiles.map((x) => x.id),
                    setSelectedFiles
                  )
                }
              >
                Delete {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </Button>

              <Button
                variant='outline'
                color='yellow'
                leftIcon={<IconStar size='1rem' />}
                onClick={() => bulkFavorite(selectedFiles.map((x) => x.id))}
              >
                Favorite {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </Button>

              <Button
                variant='outline'
                color='gray'
                onClick={() => {
                  setSelectedFiles([]);
                }}
              >
                Clear selection
              </Button>
            </Group>
          </Paper>
        )}

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
                        copyFile(file, clipboard);
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
                        deleteFile(file, () => {});
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
          selectedRecords={selectedFiles}
          onSelectedRecordsChange={setSelectedFiles}
        />
      </Box>
    </>
  );
}
