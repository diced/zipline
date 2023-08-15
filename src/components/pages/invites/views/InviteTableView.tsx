import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { Invite } from '@/lib/db/models/invite';
import { ActionIcon, Box, Group, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy, IconTrashFilled } from '@tabler/icons-react';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { copyInviteUrl, deleteInvite } from '../actions';
import { useSettingsStore } from '@/lib/store/settings';

export default function InviteTableView() {
  const clipboard = useClipboard();
  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);

  const { data, isLoading } = useSWR<Extract<Response['/api/auth/invites'], Invite[]>>('/api/auth/invites');

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [sorted, setSorted] = useState<Invite[]>(data ?? []);

  useEffect(() => {
    if (data) {
      const sorted = data.sort((a, b) => {
        const cl = sortStatus.columnAccessor as keyof Invite;

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
              accessor: 'inviter.username',
              title: 'Created by',
              sortable: true,
            },
            {
              accessor: 'createdAt',
              title: 'Created',
              sortable: true,
              render: (invite) => <RelativeDate date={invite.createdAt} />,
            },
            {
              accessor: 'updatedAt',
              title: 'Last update at',
              sortable: true,
              render: (invite) => <RelativeDate date={invite.updatedAt} />,
            },
            {
              accessor: 'expiresAt',
              title: 'Expires',
              sortable: true,
              render: (invite) => (invite.expiresAt ? <RelativeDate date={invite.expiresAt} /> : 'Never'),
            },
            {
              accessor: 'maxUses',
              sortable: true,
              render: (invite) => (invite.maxUses ? invite.maxUses.toLocaleString() : 'Unlimited'),
            },
            {
              accessor: 'uses',
              sortable: true,
            },
            {
              accessor: 'actions',
              width: 90,
              render: (invite) => (
                <Group spacing='sm'>
                  <Tooltip label='Copy invite link'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        copyInviteUrl(invite, clipboard);
                      }}
                    >
                      <IconCopy size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Delete invite'>
                    <ActionIcon
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInvite(warnDeletion, invite);
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
