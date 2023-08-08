import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { User } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { useViewStore } from '@/lib/store/view';
import {
  ActionIcon,
  Button,
  FileInput,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Switch,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPhotoMinus, IconUserCancel, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { mutate } from 'swr';
import UserGridView from './views/UserGridView';
import UserTableView from './views/UserTableView';
import { readToDataURL } from '@/lib/base64';
import { canInteract } from '@/lib/role';
import { useUserStore } from '@/lib/store/user';

export default function DashboardUsers() {
  const currentUser = useUserStore((state) => state.user);
  const view = useViewStore((state) => state.users);
  const [open, setOpen] = useState(false);

  const form = useForm<{
    username: string;
    password: string;
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    avatar: File | null;
  }>({
    initialValues: {
      username: '',
      password: '',
      role: 'USER',
      avatar: null,
    },
    validate: {
      username: hasLength({ min: 1 }, 'Username is required'),
      password: hasLength({ min: 1 }, 'Password is required'),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    let avatar64: string | null = null;
    if (values.avatar) {
      if (!values.avatar.type.startsWith('image/')) return form.setFieldError('avatar', 'Invalid file type');

      try {
        const res = await readToDataURL(values.avatar);
        avatar64 = res;
      } catch (e) {
        console.error(e);

        return form.setFieldError('avatar', 'Failed to read avatar file');
      }
    }

    const { data, error } = await fetchApi<Extract<Response['/api/users'], User>>('/api/users', 'POST', {
      username: values.username,
      password: values.password,
      role: values.role ?? 'USER',
      ...(avatar64 ? { avatar: avatar64 } : {}),
    });

    if (error) {
      notifications.show({
        title: 'Failed to create user',
        message: error.message,
        color: 'red',
        icon: <IconUserCancel size='1rem' />,
      });
    } else {
      notifications.show({
        title: 'User created',
        message: `User ${data?.username} has been created`,
        color: 'blue',
        icon: <IconUserPlus size='1rem' />,
      });

      form.reset();
      setOpen(false);
      mutate('/api/users?noincl=true');
    }
  };

  return (
    <>
      <Modal centered opened={open} onClose={() => setOpen(false)} title={<Title>Create a new user</Title>}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack spacing='sm'>
            <TextInput
              label='Username'
              placeholder='Enter a username...'
              {...form.getInputProps('username')}
            />
            <PasswordInput
              label='Password'
              placeholder='Enter a password...'
              {...form.getInputProps('password')}
            />
            <FileInput
              label='Avatar'
              placeholder='Select an avatar...'
              rightSection={
                <Tooltip label='Clear avatar'>
                  <ActionIcon
                    variant='transparent'
                    disabled={!form.values.avatar}
                    onClick={() => form.setFieldValue('avatar', null)}
                  >
                    <IconPhotoMinus size='1rem' />
                  </ActionIcon>
                </Tooltip>
              }
              {...form.getInputProps('avatar')}
            />

            <Select
              label='Role'
              defaultValue={'USER'}
              data={[
                { value: 'USER', label: 'User' },
                {
                  value: 'ADMIN',
                  label: 'Administrator',
                  disabled: !canInteract(currentUser?.role, 'ADMIN'),
                },
              ]}
              {...form.getInputProps('role')}
            />

            <Button type='submit' variant='outline' radius='sm' leftIcon={<IconUserPlus size='1rem' />}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>Users</Title>

        <Tooltip label='Create a new user'>
          <ActionIcon variant='outline' onClick={() => setOpen(true)}>
            <IconUserPlus size='1rem' />
          </ActionIcon>
        </Tooltip>

        <GridTableSwitcher type='users' />
      </Group>

      {view === 'grid' ? <UserGridView /> : <UserTableView />}
    </>
  );
}
