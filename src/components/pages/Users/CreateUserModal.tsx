import { Button, Group, Modal, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { IconUserPlus, IconUserX } from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';

export function CreateUserModal({ open, setOpen, updateUsers }) {
  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      administrator: false,
    },
  });

  const onSubmit = async (values) => {
    const cleanUsername = values.username.trim();
    const cleanPassword = values.password.trim();
    if (cleanUsername === '') return form.setFieldError('username', "Username can't be nothing");
    if (cleanPassword === '') return form.setFieldError('password', "Password can't be nothing");

    const data = {
      username: cleanUsername,
      password: cleanPassword,
      administrator: values.administrator,
    };

    setOpen(false);
    const res = await useFetch('/api/auth/register', 'POST', data);
    if (res.error) {
      showNotification({
        title: 'Failed to create user',
        message: res.error,
        icon: <IconUserX size='1rem' />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Created user: ' + cleanUsername,
        message: '',
        icon: <IconUserPlus size='1rem' />,
        color: 'green',
      });
    }

    updateUsers();
  };

  return (
    <Modal opened={open} onClose={() => setOpen(false)} title={<Title>Create User</Title>}>
      <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
        <TextInput id='username' label='Username' {...form.getInputProps('username')} />
        <TextInput id='password' label='Password' type='password' {...form.getInputProps('password')} />
        <Switch mt='sm' id='administrator' label='Administrator' {...form.getInputProps('administrator')} />

        <Group position='right' mt='md'>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type='submit' rightIcon={<IconUserPlus size='1rem' />}>
            Create
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
