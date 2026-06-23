import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { Invite } from '@/lib/db/models/invite';
import { useSettingsStore } from '@/lib/client/store/settings';
import { ActionIcon, Anchor, Box, Group, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy, IconQrcode, IconTrashFilled } from '@tabler/icons-react';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { copyInviteUrl, deleteInvite } from '../actions';
import QRCodeModal from '@/components/QRCodeModal';

export default function InviteTableView() {
  const clipboard = useClipboard();
  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);

  const { data, isLoading } = useSWR<Extract<Response['/api/auth/invites'], Invite[]>>('/api/auth/invites');

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });

  const sorted = useMemo<Invite[]>(() => {
    if (!data) return [];

    const { columnAccessor, direction } = sortStatus;
    const key = columnAccessor as keyof Invite;

    return [...data].sort((a, b) => {
      const av = a[key]!;
      const bv = b[key]!;

      if (av === bv) return 0;
      return direction === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
  }, [data, sortStatus]);

  const [qrOpen, setQrOpen] = useState<Invite | null>(null);

  return (
    <>
      <QRCodeModal
        opened={!!qrOpen}
        onClose={() => setQrOpen(null)}
        url={qrOpen ? `/invite/${qrOpen.code}` : ''}
      />

      <Box my='sm'>
        <DataTable
          withTableBorder
          minHeight={200}
          records={sorted ?? []}
          columns={[
            {
              accessor: 'code',
              sortable: true,
              render: (invite) => (
                <Anchor href={`/invite/${invite.code}`} target='_blank'>
                  {invite.code}
                </Anchor>
              ),
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
              textAlign: 'right',
              render: (invite) => (
                <Group gap='sm' justify='right' wrap='nowrap'>
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
                  <Tooltip label='Show QR code'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrOpen(invite);
                      }}
                    >
                      <IconQrcode size='1rem' />
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
          onSortStatusChange={(s) => setSortStatus(s as unknown as any)}
        />
      </Box>
    </>
  );
}
