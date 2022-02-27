import React, { useState, useEffect } from 'react';

import { useStoreSelector } from 'lib/redux/store';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';
import { useForm } from '@mantine/hooks';
import { Avatar, Modal, Title, TextInput, Group, Button, Card, Grid, ActionIcon, SimpleGrid, Switch, Skeleton } from '@mantine/core';
import { Cross1Icon, PlusIcon, TrashIcon } from '@modulz/radix-icons';
import { useNotifications } from '@mantine/notifications';


function CreateUserModal({ open, setOpen, updateUsers }) {
  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      administrator: false,
    },
  });
  const notif = useNotifications();

  const onSubmit = async (values) => {
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
      notif.showNotification({
        title: 'Failed to create user',
        message: res.error,
        icon: <TrashIcon />,
        color: 'red',
      });
    } else {
      notif.showNotification({
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
      <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
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
  const user = useStoreSelector(state => state.user);
  const router = useRouter();
  const notif = useNotifications();

  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);

  const updateUsers = async () => {
    const us = await useFetch('/api/users');
    if (!us.error) {
      setUsers(us);
    } else {
      router.push('/dashboard');
    };
  };

  const handleDelete = async (user) => {
    const res = await useFetch('/api/users', 'DELETE', {
      id: user.id,
    });
    if (res.error) {
      notif.showNotification({
        title: 'Failed to delete user',
        message: res.error,
        color: 'red',
        icon: <Cross1Icon />,
      });
    } else {
      notif.showNotification({
        title: 'User deleted',
        message: '',
        color: 'green',
        icon: <TrashIcon />,
      });
    }

    updateUsers();
  };

  useEffect(() => {
    updateUsers();
  }, []);

  return (
    <>
      <CreateUserModal open={open} setOpen={setOpen} updateUsers={updateUsers} />
      <Group>
        <Title sx={{ marginBottom: 12 }}>Users</Title>
        <ActionIcon variant='filled' color='primary' onClick={() => setOpen(true)}><PlusIcon/></ActionIcon>
      </Group>
      <SimpleGrid
        cols={3}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        {users.length ? users.filter(x => x.username !== user.username).map((user, i) => (
          <Card key={user.id} sx={{ maxWidth: '100%' }}>
            <Group position='apart'>
              <Group position='left'>
                <Avatar  color={user.administrator ? 'primary' : 'dark'}>{user.username[0]}</Avatar>
                <Title>{user.username}</Title>
              </Group>
              <Group position='right'>
                <ActionIcon aria-label='delete' onClick={() => handleDelete(user)}>
                  <TrashIcon />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        )): [1,2,3,4].map(x => (
          <div key={x}>
            <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }}/>
          </div>
        ))}
      </SimpleGrid>
    </>
  );
}