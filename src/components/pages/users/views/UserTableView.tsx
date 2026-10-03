import RelativeDate from '@/components/RelativeDate';
import { useUserStore } from '@/lib/client/store/user';
import { LimitedUser } from '@/lib/db/models/user';
import { canInteract } from '@/lib/role';
import { ROLE_KEYS } from '../roleKeys';
import { ActionIcon, Avatar, Box, Group, Tooltip } from '@mantine/core';
import { IconEdit, IconFiles, IconTrashFilled } from '@tabler/icons-react';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { deleteUser } from '../actions';
import EditUserModal from '../EditUserModal';

export default function UserTableView() {
  const { t } = useTranslation('users');
  const currentUser = useUserStore((state) => state.user);

  const { data, isLoading } = useSWR<LimitedUser[]>('/api/users?noincl=true');

  const [selectedUser, setSelectedUser] = useState<LimitedUser | null>(null);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });

  const sorted = useMemo<LimitedUser[]>(() => {
    if (!data) return [];

    const { columnAccessor, direction } = sortStatus;
    const key = columnAccessor as keyof LimitedUser;

    return [...data].sort((a, b) => {
      const av = a[key]!;
      const bv = b[key]!;

      if (av === bv) return 0;
      return direction === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
  }, [data, sortStatus]);

  return (
    <>
      <EditUserModal opened={!!selectedUser} onClose={() => setSelectedUser(null)} user={selectedUser} />

      <Box my='sm'>
        <DataTable
          withTableBorder
          minHeight={200}
          noRecordsText={t('table.noRecords', { ns: 'common' })}
          records={sorted ?? []}
          columns={[
            {
              accessor: 'avatar',
              title: t('table.columns.avatar'),
              render: (user) => (
                <Avatar radius='sm' src={user.avatar}>
                  {user.username[0].toUpperCase()}
                </Avatar>
              ),
            },
            { accessor: 'username', title: t('table.columns.username'), sortable: true },
            {
              accessor: 'role',
              title: t('table.columns.role'),
              sortable: true,
              render: (user) => t(ROLE_KEYS[user.role ?? 'USER']),
            },
            {
              accessor: 'createdAt',
              title: t('table.columns.created'),
              sortable: true,
              render: (user) => <RelativeDate date={user.createdAt} />,
            },
            {
              accessor: 'updatedAt',
              title: t('table.columns.updated'),
              sortable: true,
              render: (user) => <RelativeDate date={user.updatedAt} />,
            },
            {
              accessor: 'actions',
              title: t('table.columns.actions'),
              textAlign: 'right',
              render: (user) => (
                <Group gap='sm' justify='right' wrap='nowrap'>
                  <Tooltip label={t('table.viewFiles')}>
                    <ActionIcon
                      component={Link}
                      to={`/dashboard/admin/users/${user.id}/files`}
                      disabled={!canInteract(currentUser?.role, user?.role)}
                    >
                      <IconFiles size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label={t('table.edit')}>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                      }}
                      disabled={!canInteract(currentUser?.role, user?.role)}
                    >
                      <IconEdit size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label={t('table.delete')}>
                    <ActionIcon
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteUser(user);
                      }}
                      disabled={!canInteract(currentUser?.role, user?.role)}
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
