import { Button, Group, Modal, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { DeleteIcon, PlusIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';

export function EditUserModal({ open, setOpen, updateUsers, user }) {
  let form;

  if (user) {
    form = useForm({
      initialValues: {
        username: user.username,
        password: '',
        administrator: user.administrator,
      },
    });
  }

  const onSubmit = async (values) => {
    const cleanUsername = values.username.trim();
    const cleanPassword = values.password.trim();

    const data = {
      username: null,
      password: null,
      administrator: values.administrator,
    };

    if (cleanUsername !== '' && cleanUsername !== user.username) data.username = cleanUsername;
    if (cleanPassword !== '') data.password = cleanPassword;

    setOpen(false);
    const res = await useFetch('/api/user/' + user.id, 'PATCH', data);
    if (res.error) {
      showNotification({
        title: 'Failed to edit user',
        message: res.error,
        icon: <DeleteIcon />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Edited user: ' + cleanUsername,
        message: '',
        icon: <PlusIcon />,
        color: 'green',
      });
    }

    updateUsers();
  };

  return (
    <Modal opened={open} onClose={() => setOpen(false)} title={<Title>Edit User {user?.username}</Title>}>
      {user && (
        <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
          <TextInput id='username' label='Username' {...form.getInputProps('username')} />
          <TextInput id='password' label='Password' type='password' {...form.getInputProps('password')} />
          <Switch mt='sm' id='administrator' label='Administrator' {...form.getInputProps('administrator')} />

          <Group position='right' mt='md'>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type='submit'>Save</Button>
          </Group>
        </form>
      )}
    </Modal>
  );
}
