import RelativeDate from '@/components/RelativeDate';
import FileModal from '@/components/file/DashboardFile/FileModal';
import { copyFile, deleteFile, viewFile } from '@/components/file/actions';
import { bytes } from '@/lib/bytes';
import { type File } from '@/lib/db/models/file';
import { useSettingsStore } from '@/lib/store/settings';
import { ActionIcon, Box, Button, Group, Paper, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import type { Prisma } from '@prisma/client';
import { IconCopy, IconExternalLink, IconFile, IconStar, IconTrashFilled } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useState } from 'react';
import { bulkDelete, bulkFavorite } from '../bulk';
import { useApiPagination } from '../useApiPagination';

type ReducerQuery = {
  state: { name: string; originalName: string; type: string };
  action: { field: string; query: string };
};

const PER_PAGE_OPTIONS = [10, 20, 50];

const NAMES = {
  up: {
    name: 'Name',
    originalName: 'Original name',
    type: 'Type',
  },
  low: {
    name: 'name',
    originalName: 'original name',
    type: 'type',
  },
};

function SearchFilter({
  setSearchField,
  searchQuery,
  setSearchQuery,
  field,
}: {
  searchQuery: {
    name: string;
    originalName: string;
    type: string;
  };
  setSearchField: (...args: any) => void;
  setSearchQuery: (...args: any) => void;
  field: 'name' | 'originalName' | 'type';
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchField(field);

    setSearchQuery({
      field,
      query: e.target.value,
    });
  };

  return (
    <TextInput
      label={NAMES.up[field]}
      placeholder={`Search by ${NAMES.low[field]}`}
      value={searchQuery[field]}
      onChange={onChange}
      variant='filled'
      size='sm'
    />
  );
}

export default function FileTable({ id }: { id?: string }) {
  const router = useRouter();
  const clipboard = useClipboard();
  const [searchThreshold, warnDeletion] = useSettingsStore((state) => [
    state.settings.searchThreshold,
    state.settings.warnDeletion,
  ]);

  const [page, setPage] = useState<number>(router.query.page ? parseInt(router.query.page as string) : 1);
  const [perpage, setPerpage] = useState<number>(20);
  const [sort, setSort] = useState<keyof Prisma.FileOrderByWithAggregationInput>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [searchField, setSearchField] = useState<'name' | 'originalName' | 'type'>('name');
  const [searchQuery, setSearchQuery] = useReducer(
    (state: ReducerQuery['state'], action: ReducerQuery['action']) => {
      return {
        ...state,
        [action.field]: action.query,
      };
    },
    { name: '', originalName: '', type: '' },
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const searching =
    searchQuery.name.trim() !== '' ||
    searchQuery.originalName.trim() !== '' ||
    searchQuery.type.trim() !== '';

  const { data, isLoading } = useApiPagination({
    page,
    perpage,
    filter: 'all',
    sort,
    order,
    id,
    ...(searchQuery[searchField].trim() !== '' && {
      search: {
        threshold: searchThreshold,
        field: searchField,
        query: searchQuery[searchField],
      },
    }),
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

  useEffect(() => {
    if (data && selectedFile) {
      const file = data.page.find((x) => x.id === selectedFile.id);

      if (file) {
        setSelectedFile(file);
      }
    }
  }, [data]);

  useEffect(() => {
    for (const field of ['name', 'originalName', 'type'] as const) {
      if (field !== searchField) {
        setSearchQuery({
          field,
          query: '',
        });
      }
    }
  }, [searchField]);

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
                leftSection={<IconTrashFilled size='1rem' />}
                onClick={() =>
                  bulkDelete(
                    selectedFiles.map((x) => x.id),
                    setSelectedFiles,
                  )
                }
              >
                Delete {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </Button>

              <Button
                variant='outline'
                color='yellow'
                leftSection={<IconStar size='1rem' />}
                onClick={() => bulkFavorite(selectedFiles.map((x) => x.id))}
              >
                Favorite {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </Button>

              <Button
                variant='outline'
                onClick={() => {
                  setSelectedFiles([]);
                }}
              >
                Clear selection
              </Button>
            </Group>
          </Paper>
        )}

        {/* @ts-ignore */}
        <DataTable
          borderRadius='sm'
          withTableBorder
          minHeight={200}
          records={data?.page ?? []}
          columns={[
            {
              accessor: 'name',
              sortable: true,
              filter: (
                <SearchFilter
                  setSearchField={setSearchField}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  field='name'
                />
              ),
              filtering: searchField === 'name' && searchQuery.name.trim() !== '',
            },
            {
              accessor: 'originalName',
              sortable: true,
              filter: (
                <SearchFilter
                  setSearchField={setSearchField}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  field='originalName'
                />
              ),
              filtering: searchField === 'originalName' && searchQuery.originalName.trim() !== '',
            },
            {
              accessor: 'type',
              sortable: true,
              filter: (
                <SearchFilter
                  setSearchField={setSearchField}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  field='type'
                />
              ),
              filtering: searchField === 'type' && searchQuery.type.trim() !== '',
            },
            { accessor: 'size', sortable: true, render: (file) => bytes(file.size) },
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
              accessor: 'similarity',
              title: 'Relevance',
              sortable: true,
              render: (file) => (file.similarity ? file.similarity.toFixed(4) : 'N/A'),
              hidden: !searching,
            },
            {
              accessor: 'actions',
              textAlign: 'right',
              width: 180,
              render: (file) => (
                <Group gap='sm'>
                  <Tooltip label='More details'>
                    <ActionIcon>
                      <IconFile size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label='View file in new tab'>
                    <ActionIcon
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
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(warnDeletion, file, () => {});
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
          totalRecords={searching ? data?.page.length : data?.total ?? 0}
          recordsPerPage={searching ? undefined : perpage}
          onRecordsPerPageChange={searching ? undefined : setPerpage}
          recordsPerPageOptions={searching ? undefined : PER_PAGE_OPTIONS}
          page={searching ? undefined : page}
          onPageChange={searching ? undefined : setPage}
          // {...(!searching && {
          //   recordsPerPage: perpage,
          //   onRecordsPerPageChange: setPerpage,
          //   recordsPerPageOptions: PER_PAGE_OPTIONS,
          //   page: page as number,
          //   onPageChange: setPage,
          // })}
          sortStatus={{
            columnAccessor: sort,
            direction: order,
          }}
          onSortStatusChange={(data) => {
            setSort(data.columnAccessor as keyof Prisma.FileOrderByWithAggregationInput);
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
