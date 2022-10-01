import { Modal, TextInput, Switch, Group, Button, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { DeleteIcon, PlusIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';

export function CreateUserModal({ open, setOpen, updateUsers }) {
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