import { ActionIcon, Avatar, Card, Group, SimpleGrid, Skeleton, Stack, Title } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { CrossIcon, DeleteIcon, PencilIcon, PlusIcon } from 'components/icons';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { userSelector } from 'lib/recoil/user';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';

export default function Users() {
  const self = useRecoilValue(userSelector);
  const router = useRouter();
  const modals = useModals();

  const [users, setUsers] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleDelete = async (user, delete_files) => {
    const res = await useFetch(`/api/user/${user.id}`, 'DELETE', {
      delete_files,
    });

    if (res.error) {
      showNotification({
        title: 'Failed to delete user',
        message: res.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    } else {
      showNotification({
        title: 'User deleted',
        message: '',
        color: 'green',
        icon: <DeleteIcon />,
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
          overlayBlur: 3,
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
          <PlusIcon />
        </ActionIcon>
      </Group>
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
                            <PencilIcon />
                          </ActionIcon>
                          <ActionIcon aria-label='delete' onClick={() => openDeleteModal(user)}>
                            <DeleteIcon />
                          </ActionIcon>
                        </>
                      )}
                    </Stack>
                  </Group>
                </Card>
              ))
          : [1, 2, 3].map((x) => <Skeleton key={x} width='100%' height={100} radius='sm' />)}
      </SimpleGrid>
    </>
  );
}
