import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { Url } from '@/lib/db/models/url';
import { ActionIcon, Anchor, Box, Group, TextInput, Tooltip } from '@mantine/core';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useReducer, useState } from 'react';
import useSWR from 'swr';
import { copyUrl, deleteUrl } from '../actions';
import { IconCopy, IconTrashFilled } from '@tabler/icons-react';
import { useConfig } from '@/components/ConfigProvider';
import { useClipboard } from '@mantine/hooks';
import { useSettingsStore } from '@/lib/store/settings';

const NAMES = {
  up: {
    code: 'Code',
    vanity: 'Vanity',
    destination: 'Destination',
  },
  down: {
    code: 'code',
    vanity: 'vanity',
    destination: 'destination',
  },
};

function SearchFilter({
  setSearchField,
  searchQuery,
  setSearchQuery,
  field,
}: {
  setSearchField: (...args: any) => void;
  searchQuery: {
    code: string;
    vanity: string;
    destination: string;
  };
  setSearchQuery: (...args: any) => void;
  field: 'code' | 'vanity' | 'destination';
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
      placeholder={`Search by ${NAMES.up[field]}`}
      value={searchQuery[field]}
      onChange={onChange}
      variant='filled'
      size='sm'
    />
  );
}

const fetcher = async ({
  searchQuery,
  searchField,
  searchThreshold,
}: {
  searchQuery?: string;
  searchField?: string;
  searchThreshold?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (searchQuery) {
    searchParams.append('searchQuery', searchQuery);
    if (searchField) searchParams.append('searchField', searchField);
    if (searchThreshold) searchParams.append('searchThreshold', searchThreshold.toString());
  }

  const res = await fetch(`/api/user/urls${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  if (!res.ok) {
    const json = await res.json();

    throw new Error(json.message);
  }

  return res.json();
};

export default function UrlTableView() {
  const config = useConfig();
  const clipboard = useClipboard();

  const [searchField, setSearchField] = useState<'code' | 'vanity' | 'destination'>('destination');
  const [searchQuery, setSearchQuery] = useReducer(
    (
      state: { code: string; vanity: string; destination: string },
      action: {
        field: 'code' | 'vanity' | 'destination';
        query: string;
      },
    ) => {
      return {
        ...state,
        [action.field]: action.query,
      };
    },
    {
      code: '',
      vanity: '',
      destination: '',
    },
  );
  const [warnDeletion, searchThreshold] = useSettingsStore((s) => [
    s.settings.warnDeletion,
    s.settings.searchThreshold,
  ]);

  const { data, isLoading } = useSWR<Extract<Response['/api/user/urls'], Url[]>>(
    {
      key: '/api/user/urls',
      ...(searchQuery[searchField].trim() !== '' && {
        searchQuery: searchQuery[searchField],
        searchField,
        searchThreshold,
      }),
    },
    fetcher,
  );

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [sorted, setSorted] = useState<Url[]>(data ?? []);

  const searching =
    searchQuery.code.trim() !== '' ||
    searchQuery.vanity.trim() !== '' ||
    searchQuery.destination.trim() !== '';

  useEffect(() => {
    if (data) {
      const sorted = data.sort((a, b) => {
        const cl = sortStatus.columnAccessor as keyof Url;

        return sortStatus.direction === 'asc' ? (a[cl]! > b[cl]! ? 1 : -1) : a[cl]! < b[cl]! ? 1 : -1;
      });

      setSorted(sorted);
    }
  }, [sortStatus]);

  useEffect(() => {
    if (data) {
      setSorted(data);
    }
  }, [data]);

  useEffect(() => {
    for (const field of ['code', 'vanity', 'destination'] as const) {
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
      <Box my='sm'>
        <DataTable
          borderRadius='sm'
          withTableBorder
          minHeight={200}
          records={sorted ?? []}
          columns={[
            {
              accessor: 'code',
              sortable: true,
              filter: (
                <SearchFilter
                  setSearchField={setSearchField}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  field='code'
                />
              ),
              filtering: searchField === 'code' && searchQuery.code.trim() !== '',
            },
            {
              accessor: 'vanity',
              sortable: true,
              render: (url) => url.vanity ?? <b>None</b>,
              filter: (
                <SearchFilter
                  setSearchField={setSearchField}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  field='vanity'
                />
              ),
              filtering: searchField === 'vanity' && searchQuery.vanity.trim() !== '',
            },
            {
              accessor: 'destination',
              sortable: true,
              render: (url) => (
                <Anchor href={url.destination} target='_blank' rel='noreferrer'>
                  {url.destination}
                </Anchor>
              ),
              filter: (
                <SearchFilter
                  setSearchField={setSearchField}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  field='destination'
                />
              ),
              filtering: searchField === 'destination' && searchQuery.destination.trim() !== '',
            },
            {
              accessor: 'views',
              sortable: true,
            },
            {
              accessor: 'maxViews',
              sortable: true,
              render: (url) => (url.maxViews ? url.maxViews : <b>None</b>),
            },
            {
              accessor: 'createdAt',
              title: 'Created',
              sortable: true,
              render: (url) => <RelativeDate date={url.createdAt} />,
            },
            {
              accessor: 'similarity',
              title: 'Relevance',
              sortable: true,
              render: (url) => (url.similarity ? url.similarity.toFixed(4) : 'N/A'),
              hidden: !searching,
            },
            {
              accessor: 'actions',
              width: 100,
              render: (url) => (
                <Group gap='sm'>
                  <Tooltip label='Copy URL'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(url, config, clipboard);
                      }}
                    >
                      <IconCopy size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Delete URL'>
                    <ActionIcon
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteUrl(warnDeletion, url);
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
          sortStatus={sortStatus}
          onSortStatusChange={(s) => setSortStatus(s as unknown as any)}
        />
      </Box>
    </>
  );
}
