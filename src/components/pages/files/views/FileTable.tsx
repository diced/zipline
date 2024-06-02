import RelativeDate from '@/components/RelativeDate';
import FileModal from '@/components/file/DashboardFile/FileModal';
import { addMultipleToFolder, copyFile, deleteFile, viewFile } from '@/components/file/actions';
import { bytes } from '@/lib/bytes';
import { type File } from '@/lib/db/models/file';
import { useSettingsStore } from '@/lib/store/settings';
import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Collapse,
  Combobox,
  Flex,
  Group,
  Input,
  InputBase,
  Paper,
  Pill,
  PillsInput,
  ScrollArea,
  Text,
  TextInput,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import type { Prisma } from '@prisma/client';
import { IconCopy, IconExternalLink, IconFile, IconStar, IconTrashFilled } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useState } from 'react';
import { bulkDelete, bulkFavorite } from '../bulk';
import { useApiPagination } from '../useApiPagination';
import useSWR from 'swr';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import TagPill from '../tags/TagPill';
import { Tag } from '@/lib/db/models/tag';

type ReducerQuery = {
  state: { name: string; originalName: string; type: string; tags: string };
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

function TagsFilter({
  setSearchField,
  setSearchQuery,
  searchQuery,
}: {
  searchQuery: {
    name: string;
    originalName: string;
    type: string;
    tags: string;
  };
  setSearchField: (...args: any) => void;
  setSearchQuery: (...args: any) => void;
}) {
  const combobox = useCombobox();
  const { data: tags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>('/api/user/tags');

  const [value, setValue] = useState(searchQuery.tags.split(','));
  const handleValueSelect = (val: string) => {
    setValue((current) => (current.includes(val) ? current.filter((v) => v !== val) : [...current, val]));
  };

  const handleValueRemove = (val: string) => {
    setValue((current) => current.filter((v) => v !== val));
  };

  const values = value.map((tag) => <TagPill key={tag} tag={tags?.find((t) => t.id === tag) || null} />);

  const triggerSave = () => {
    setSearchField('tags');

    setSearchQuery({
      field: 'tags',
      query: value.join(','),
    });
  };

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect} withinPortal={false}>
      <Combobox.DropdownTarget>
        <PillsInput onBlur={() => triggerSave()} pointer onClick={() => combobox.toggleDropdown()} w={200}>
          <Pill.Group>
            {values.length > 0 ? values : <Input.Placeholder>Pick one or more tags</Input.Placeholder>}

            <Combobox.EventsTarget>
              <PillsInput.Field
                type='hidden'
                onBlur={() => combobox.closeDropdown()}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace') {
                    event.preventDefault();
                    handleValueRemove(value[value.length - 1]);
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          {tags?.map((tag) => (
            <Combobox.Option value={tag.id} key={tag.id} active={value.includes(tag.id)}>
              <Group gap='sm'>
                <Checkbox
                  checked={value.includes(tag.id)}
                  onChange={() => {}}
                  aria-hidden
                  tabIndex={-1}
                  style={{ pointerEvents: 'none' }}
                />
                <TagPill tag={tag} />
              </Group>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default function FileTable({ id }: { id?: string }) {
  const router = useRouter();
  const clipboard = useClipboard();
  const [searchThreshold, warnDeletion] = useSettingsStore((state) => [
    state.settings.searchThreshold,
    state.settings.warnDeletion,
  ]);

  const { data: folders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    '/api/user/folders?noincl=true',
  );

  const [page, setPage] = useState<number>(router.query.page ? parseInt(router.query.page as string) : 1);
  const [perpage, setPerpage] = useState<number>(20);
  const [sort, setSort] = useState<keyof Prisma.FileOrderByWithAggregationInput>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [searchField, setSearchField] = useState<'name' | 'originalName' | 'type' | 'tags'>('name');
  const [searchQuery, setSearchQuery] = useReducer(
    (state: ReducerQuery['state'], action: ReducerQuery['action']) => {
      return {
        ...state,
        [action.field]: action.query,
      };
    },
    { name: '', originalName: '', type: '', tags: '' },
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const combobox = useCombobox();
  const [folderSearch, setFolderSearch] = useState('');

  const handleAddFolder = async (value: string) => {
    try {
      addMultipleToFolder(selectedFiles, value);
      setSelectedFiles([]);
    } catch {}
  };

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
    for (const field of ['name', 'originalName', 'type', 'tags'] as const) {
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
        <Collapse in={selectedFiles.length > 0}>
          <Paper withBorder p='sm' my='sm'>
            <Text size='sm' c='dimmed' mb='xs'>
              Selections are saved across page changes
            </Text>

            <Group>
              <Group mr='auto'>
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

                <Combobox
                  store={combobox}
                  withinPortal={false}
                  onOptionSubmit={(value) => handleAddFolder(value)}
                >
                  <Combobox.Target>
                    <InputBase
                      rightSection={<Combobox.Chevron />}
                      value={folderSearch}
                      onChange={(event) => {
                        combobox.openDropdown();
                        combobox.updateSelectedOptionIndex();
                        setFolderSearch(event.currentTarget.value);
                      }}
                      onClick={() => combobox.openDropdown()}
                      onFocus={() => combobox.openDropdown()}
                      onBlur={() => {
                        combobox.closeDropdown();
                        setFolderSearch(folderSearch || '');
                      }}
                      placeholder='Add to folder...'
                      rightSectionPointerEvents='none'
                    />
                  </Combobox.Target>

                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {folders
                        ?.filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase().trim()))
                        .map((f) => (
                          <Combobox.Option value={f.id} key={f.id}>
                            {f.name}
                          </Combobox.Option>
                        ))}
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>
              </Group>

              <Button
                variant='outline'
                onClick={() => {
                  setSelectedFiles([]);
                }}
                justify='right'
                ml='auto'
              >
                Clear selection
              </Button>
            </Group>
          </Paper>
        </Collapse>

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
              accessor: 'tags',
              sortable: false,
              width: 200,
              render: (file) => (
                <ScrollArea w={180} onClick={(e) => e.stopPropagation()}>
                  <Flex gap='sm'>
                    {file.tags!.map((tag) => (
                      <TagPill tag={tag} key={tag.id} />
                    ))}
                  </Flex>
                </ScrollArea>
              ),
              filter: (
                <TagsFilter
                  setSearchField={setSearchField}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              ),
              filtering: searchField === 'tags' && searchQuery.tags.trim() !== '',
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
              render: (file) => (file.favorite ? <Text c='yellow'>Yes</Text> : 'No'),
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
