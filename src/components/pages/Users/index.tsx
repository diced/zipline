import { ActionIcon, Avatar, Card, Group, SimpleGrid, Skeleton, Stack, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import type { User } from '@prisma/client';
import {
  IconClipboardCopy,
  IconEdit,
  IconExternalLink,
  IconGridDots,
  IconList,
  IconUserExclamation,
  IconUserMinus,
  IconUserPlus,
} from '@tabler/icons-react';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { listViewUsersSelector } from 'lib/recoil/settings';
import { userSelector } from 'lib/recoil/user';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';

export default function Users() {
  const self = useRecoilValue(userSelector);
  const router = useRouter();
  const modals = useModals();
  const clipboard = useClipboard();

  const [users, setUsers] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [listView, setListView] = useRecoilState(listViewUsersSelector);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'id',
    direction: 'asc',
  });
  const [records, setRecords] = useState(users);

  useEffect(() => {
    setRecords(users);
  }, [users]);

  useEffect(() => {
    if (!records || records.length === 0) return;

    const sortedRecords = [...records].sort((a, b) => {
      if (sortStatus.direction === 'asc') {
        return a[sortStatus.columnAccessor] > b[sortStatus.columnAccessor] ? 1 : -1;
      }

      return a[sortStatus.columnAccessor] < b[sortStatus.columnAccessor] ? 1 : -1;
    });

    setRecords(sortedRecords);
  }, [sortStatus]);

  const handleDelete = async (user, delete_files) => {
    const res = await useFetch(`/api/user/${user.id}`, 'DELETE', {
      delete_files,
    });

    if (res.error) {
      showNotification({
        title: 'Failed to delete user',
        message: res.error,
        color: 'red',
        icon: <IconUserExclamation size='1rem' />,
      });
    } else {
      showNotification({
        title: 'User deleted',
        message: '',
        color: 'green',
        icon: <IconUserMinus size='1rem' />,
      });
      updateUsers();
    }
  };

  // 2-step modal for deleting user if they want to delete their images too.
  const openDeleteModal = (user) =>
    modals.openConfirmModal({
      title: `Delete ${user.username}?`,
      closeOnConfirm: false,
      labels: { confirm: 'Yes', cancel: 'No' },
      onConfirm: () => {
        modals.openConfirmModal({
          title: `Delete ${user.username}'s files?`,
          labels: { confirm: 'Yes', cancel: 'No' },
          centered: true,
          overlayProps: { blur: 3 },
          onConfirm: () => {
            handleDelete(user, true);
            modals.closeAll();
          },
          onCancel: () => {
            handleDelete(user, false);
            modals.closeAll();
          },
        });
      },
    });

  const updateUsers = async () => {
    const us = await useFetch('/api/users');
    if (!us.error) {
      setUsers(us);
    } else {
      router.push('/dashboard');
    }
  };

  const openUser = async (user) => {
    await router.push(`/dashboard/users/${user.id}`);
  };

  useEffect(() => {
    updateUsers();
  }, []);

  return (
    <>
      <CreateUserModal open={createOpen} setOpen={setCreateOpen} updateUsers={updateUsers} />
      <EditUserModal open={editOpen} setOpen={setEditOpen} updateUsers={updateUsers} user={selectedUser} />

      <Group mb='md'>
        <Title>Users</Title>
        <ActionIcon variant='filled' color='primary' onClick={() => setCreateOpen(true)}>
          <IconUserPlus size='1rem' />
        </ActionIcon>
        <Tooltip label={listView ? 'Switch to grid view' : 'Switch to list view'}>
          <ActionIcon variant='filled' color='primary' onClick={() => setListView(!listView)}>
            {listView ? <IconList size='1rem' /> : <IconGridDots size='1rem' />}
          </ActionIcon>
        </Tooltip>
      </Group>
      {listView ? (
        <DataTable
          withBorder
          borderRadius='md'
          highlightOnHover
          verticalSpacing='sm'
          columns={[
            {
              accessor: 'avatar',
              sortable: false,
              render: (user) => (
                <Avatar src={user.avatar} color={user.administrator ? 'primary' : 'dark'} size='md'>
                  {user.username[0]}
                </Avatar>
              ),
              width: 80,
            },
            { accessor: 'id', title: 'ID', sortable: true },
            { accessor: 'username', sortable: true },
            {
              accessor: 'administrator',
              sortable: true,
              render: (user) => (user.administrator ? 'Yes' : 'No'),
            },
            {
              accessor: 'actions',
              textAlignment: 'right',
              render: (user) => (
                <Group spacing={4} position='right' noWrap>
                  <Tooltip label='Delete user'>
                    <ActionIcon onClick={() => openDeleteModal(user)} color='red'>
                      <IconUserMinus size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Edit user'>
                    <ActionIcon
                      onClick={() => {
                        setSelectedUser(user);
                        setEditOpen(true);
                      }}
                      color='blue'
                    >
                      <IconEdit size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  {user.administrator || user.superAdmin ? null : (
                    <Tooltip label='Open user'>
                      <ActionIcon color='cyan' onClick={() => openUser(user)}>
                        <IconExternalLink size='1rem' />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              ),
            },
          ]}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          records={records ? records.filter((x) => x.username !== self.username) : []}
          fetching={users.length === 0}
          loaderBackgroundBlur={5}
          minHeight='calc(100vh - 200px)'
          loaderVariant='dots'
          rowContextMenu={{
            shadow: 'xl',
            borderRadius: 'md',
            items: (user) => [
              {
                key: 'copy',
                icon: <IconClipboardCopy size='1rem' />,
                title: `Copy Username: "${user.username}"`,
                onClick: () => clipboard.copy(user.username),
              },
              {
                key: 'edit',
                icon: <IconEdit size='1rem' />,
                title: `Edit ${user.username}`,
                onClick: () => {
                  setSelectedUser(user);
                  setEditOpen(true);
                },
              },
              {
                key: 'delete',
                icon: <IconUserMinus size='1rem' />,
                title: `Delete ${user.username}`,
                onClick: () => openDeleteModal(user),
              },
            ],
          }}
          onCellClick={({ column, record: user }) => {
            if (column.accessor === 'actions') return;

            setSelectedUser(user);
            setEditOpen(true);
          }}
        />
      ) : (
        <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
          {users.length
            ? users
                .filter((x) => x.username !== self.username)
                .map((user) => (
                  <Card key={user.id} sx={{ maxWidth: '100%' }}>
                    <Group position='apart'>
                      <Group position='left'>
                        <Avatar
                          size='lg'
                          color={user.administrator ? 'primary' : 'dark'}
                          src={user.avatar ?? null}
                        >
                          {user.username[0]}
                        </Avatar>
                        <Stack spacing={0}>
                          <Title>{user.username}</Title>
                          <MutedText size='sm'>ID: {user.id}</MutedText>
                          <MutedText size='sm'>Administrator: {user.administrator ? 'yes' : 'no'}</MutedText>
                        </Stack>
                      </Group>
                      <Stack>
                        {user.administrator && !self.superAdmin ? null : (
                          <>
                            <ActionIcon
                              aria-label='edit'
                              onClick={() => {
                                setEditOpen(true);
                                setSelectedUser(user);
                              }}
                            >
                              <IconEdit size='1rem' />
                            </ActionIcon>
                            <ActionIcon aria-label='delete' onClick={() => openDeleteModal(user)}>
                              <IconUserMinus size='1rem' />
                            </ActionIcon>
                          </>
                        )}
                      </Stack>
                    </Group>
                  </Card>
                ))
            : [1, 2, 3].map((x) => <Skeleton key={x} width='100%' height={100} radius='sm' />)}
        </SimpleGrid>
      )}
    </>
  );
}
