import { Response } from '@/lib/api/response';
import { User } from '@/lib/db/models/user';
import { ActionIcon, Avatar, Box, Group, Tooltip } from '@mantine/core';
import { IconEdit, IconFiles } from '@tabler/icons-react';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import EditUserModal from '../EditUserModal';
import Link from 'next/link';
import RelativeDate from '@/components/RelativeDate';

export default function UserTableView() {
  const { data, isLoading } = useSWR<Extract<Response['/api/users'], User[]>>(`/api/users?noincl=true`);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [sorted, setSorted] = useState<User[]>(data ?? []);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (data) {
      const sorted = data.sort((a, b) => {
        const cl = sortStatus.columnAccessor as keyof User;

        return sortStatus.direction === 'asc' ? (a[cl]! > b[cl]! ? 1 : -1) : a[cl]! < b[cl]! ? 1 : -1;
      });

      setSorted(sorted);
    }
  }, [sortStatus]);

  return (
    <>
      {selectedUser && (
        <EditUserModal opened={!!selectedUser} onClose={() => setSelectedUser(null)} user={selectedUser} />
      )}

      <Box my='sm'>
        <DataTable
          borderRadius='sm'
          withBorder
          minHeight={200}
          records={sorted ?? []}
          columns={[
            {
              accessor: 'avatar',
              render: (user) => <Avatar src={user.avatar}>{user.username[0].toUpperCase()}</Avatar>,
            },
            { accessor: 'username', sortable: true },
            {
              accessor: 'createdAt',
              title: 'Created',
              sortable: true,
              render: (user) => <RelativeDate date={user.createdAt} />,
            },
            {
              accessor: 'updatedAt',
              title: 'Last updated',
              sortable: true,
              render: (user) => <RelativeDate date={user.updatedAt} />,
            },
            {
              accessor: 'actions',
              render: (user) => (
                <Group spacing='sm'>
                  <Tooltip label='Edit user'>
                    <ActionIcon
                      variant='outline'
                      color='gray'
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                      }}
                    >
                      <IconEdit size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label="View user's files">
                    <ActionIcon
                      variant='outline'
                      color='gray'
                      component={Link}
                      href={`/dashboard/admin/users/${user.id}/files`}
                    >
                      <IconFiles size='1rem' />
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
