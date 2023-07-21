import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { Url } from '@/lib/db/models/url';
import { ActionIcon, Anchor, Box, Group, Tooltip } from '@mantine/core';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { copyUrl, deleteUrl } from '../actions';
import { IconCopy, IconTrashFilled } from '@tabler/icons-react';
import { useConfig } from '@/components/ConfigProvider';
import { useClipboard } from '@mantine/hooks';

export default function UrlTableView() {
  const config = useConfig();
  const clipboard = useClipboard();

  const { data, isLoading } = useSWR<Extract<Response['/api/user/urls'], Url[]>>('/api/user/urls');

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [sorted, setSorted] = useState<Url[]>(data ?? []);

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

  return (
    <>
      <Box my='sm'>
        <DataTable
          borderRadius='sm'
          withBorder
          minHeight={200}
          records={sorted ?? []}
          columns={[
            {
              accessor: 'code',
              sortable: true,
            },
            {
              accessor: 'vanity',
              sortable: true,
              render: (url) => url.vanity ?? <b>None</b>,
            },
            {
              accessor: 'destination',
              sortable: true,
              render: (url) => (
                <Anchor href={url.destination} target='_blank' rel='noreferrer'>
                  {url.destination}
                </Anchor>
              ),
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
              accessor: 'actions',
              width: 150,
              render: (url) => (
                <Group spacing='sm'>
                  <Tooltip label='Copy URL'>
                    <ActionIcon
                      variant='outline'
                      color='gray'
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
                      variant='outline'
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteUrl(url);
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
          onSortStatusChange={(s) => setSortStatus(s)}
        />
      </Box>
    </>
  );
}
