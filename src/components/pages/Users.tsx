import { ActionIcon, Avatar, Button, Card, Group, Modal, SimpleGrid, Skeleton, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { CrossIcon, DeleteIcon, PlusIcon } from 'components/icons';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { userSelector } from 'lib/recoil/user';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';


function CreateUserModal({ open, setOpen, updateUsers }) {
  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      administrator: false,
    },
  });

  const onSubmit = async values => {
    const cleanUsername = values.username.trim();
    const cleanPassword = values.password.trim();
    if (cleanUsername === '') return form.setFieldError('username', 'Username can\'t be nothing');
    if (cleanPassword === '') return form.setFieldError('password', 'Password can\'t be nothing');

    const data = {
      username: cleanUsername,
      password: cleanPassword,
      administrator: values.administrator,
    };

    setOpen(false);
    const res = await useFetch('/api/auth/create', 'POST', data);
    if (res.error) {
      showNotification({
        title: 'Failed to create user',
        message: res.error,
        icon: <DeleteIcon />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Created user: ' + cleanUsername,
        message: '',
        icon: <PlusIcon />,
        color: 'green',
      });
    }

    updateUsers();
  };

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={<Title>Create User</Title>}
    >
      <form onSubmit={form.onSubmit(v => onSubmit(v))}>
        <TextInput id='username' label='Username' {...form.getInputProps('username')} />
        <TextInput id='password' label='Password' type='password' {...form.getInputProps('password')} />
        <Switch mt={12} id='administrator' label='Administrator' {...form.getInputProps('administrator')} />

        <Group position='right' mt={22}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type='submit'>Create</Button>
        </Group>
      </form>
    </Modal>
  );
}

export default function Users() {
  const user = useRecoilValue(userSelector);
  const router = useRouter();
  const modals = useModals();

  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);

  const handleDelete = async (user, delete_images) => {
    const res = await useFetch('/api/users', 'DELETE', {
      id: user.id,
      delete_images,
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
  const openDeleteModal = user => modals.openConfirmModal({
    title: `Delete ${user.username}?`,
    closeOnConfirm: false,
    labels: { confirm: 'Yes', cancel: 'No' },
    onConfirm: () => {
      modals.openConfirmModal({
        title: `Delete ${user.username}'s images?`,
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
    };
  };

  useEffect(() => {
    updateUsers();
  }, []);

  return (
    <>
      <CreateUserModal open={open} setOpen={setOpen} updateUsers={updateUsers} />
      <Group mb='md'>
        <Title>Users</Title>
        <ActionIcon variant='filled' color='primary' onClick={() => setOpen(true)}><PlusIcon /></ActionIcon>
      </Group>
      <SimpleGrid
        cols={3}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        {users.length ? users.filter(x => x.username !== user.username).map(user => (
          <Card key={user.id} sx={{ maxWidth: '100%' }}>
            <Group position='apart'>
              <Group position='left'>
                <Avatar size='lg' color={user.administrator ? 'primary' : 'dark'} src={user.avatar ?? null}>{user.username[0]}</Avatar>
                <Stack spacing={0}>
                  <Title>{user.username}</Title>
                  <MutedText size='sm'>ID: {user.id}</MutedText>
                  <MutedText size='sm'>Administrator: {user.administrator ? 'yes' : 'no'}</MutedText>
                </Stack>
              </Group>
              <Group position='right'>
                <ActionIcon aria-label='delete' onClick={() => openDeleteModal(user)}>
                  <DeleteIcon />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        )) : [1, 2, 3].map(x => (
          <Skeleton key={x} width='100%' height={100} radius='sm' />
        ))}
      </SimpleGrid>
    </>
  );
}