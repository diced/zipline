import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/store/user';
import {
  ActionIcon,
  Button,
  CopyButton,
  Paper,
  PasswordInput,
  ScrollArea,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAsteriskSimple,
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconKey,
  IconUser,
  IconUserCancel,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';

export default function SettingsUser() {
  const [user, setUser] = useUserStore((state) => [state.user, state.setUser]);

  const [tokenShown, setTokenShown] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await fetchApi<Response['/api/user/token']>('/api/user/token');

      if (data) {
        setToken(data.token || '');
      }
    })();
  }, []);

  const form = useForm({
    initialValues: {
      username: user?.username ?? '',
      password: '',
    },
    validate: {
      username: hasLength({ min: 1 }, 'Username is required'),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const send: {
      username?: string;
      password?: string;
    } = {};

    if (values.username !== user?.username) send['username'] = values.username.trim();
    if (values.password) send['password'] = values.password.trim();

    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', send);

    if (!data && error) {
      if (error.message === 'Username already exists') {
        form.setFieldError('username', error.message);
      } else {
        notifications.show({
          title: 'Error while updating user',
          message: error.message,
          color: 'red',
          icon: <IconUserCancel size='1rem' />,
        });
      }

      return;
    }

    if (!data?.user) return;

    mutate('/api/user');
    setUser(data.user);
    notifications.show({
      message: 'User updated',
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>User Info</Title>
      <Text c='dimmed' size='sm' mb='sm'>
        {user?.id}
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <TextInput
          rightSection={
            <CopyButton value={token} timeout={1000}>
              {({ copied, copy }) => (
                <Tooltip label='Click to copy token'>
                  <ActionIcon onClick={copy} variant='subtle' color='gray'>
                    {copied ? <IconCheck color='green' size='1rem' /> : <IconCopy size='1rem' />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          }
          // @ts-ignore this works trust
          component='span'
          label='Token'
          onClick={() => setTokenShown(true)}
          leftSection={<IconKey size='1rem' />}
        >
          <ScrollArea scrollbarSize={5}>{tokenShown ? token : '[click to reveal]'}</ScrollArea>
        </TextInput>

        <TextInput
          label='Username'
          {...form.getInputProps('username')}
          leftSection={<IconUser size='1rem' />}
        />
        <PasswordInput
          label='Password'
          description='Leave blank to keep the same password'
          autoComplete='new-password'
          {...form.getInputProps('password')}
          leftSection={<IconAsteriskSimple size='1rem' />}
        />

        <Button type='submit' mt='md' loading={!user} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
