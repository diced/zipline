import type { User } from '@/lib/db/models/user';
import { ApiError } from '@/lib/api/errors';
import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/client/store/user';
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
import { useForm } from '@mantine/form';
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
import { useState } from 'react';
import { mutate } from 'swr';
import useSWR from 'swr';
import { useShallow } from 'zustand/shallow';

export default function SettingsUser() {
  const [user, setUser] = useUserStore(useShallow((state) => [state.user, state.setUser]));

  const { data: tokenPayload } = useSWR<Response['/api/user/token']>('/api/user/token');

  if (!user) {
    return (
      <Paper withBorder p='sm'>
        <Title order={2}>User</Title>
        <Text c='dimmed' size='sm' mt='sm'>
          Loading…
        </Text>
      </Paper>
    );
  }

  return <Form user={user} setUser={setUser} token={tokenPayload?.token ?? ''} />;
}

function Form({ user, setUser, token }: { user: User; setUser: (u: User) => void; token: string }) {
  const [tokenShown, setTokenShown] = useState(false);

  const form = useForm({
    initialValues: {
      username: user.username,
      password: '',
      currentPassword: '',
    },
    validate: {
      username: (value) => (value.length < 1 ? 'Username is required' : null),
      currentPassword: (value, values) =>
        values.password && !value ? 'Enter your current password to change it' : null,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const send: {
      username?: string;
      password?: string;
      currentPassword?: string;
    } = {};

    if (values.username !== user.username) send['username'] = values.username.trim();
    if (values.password) {
      send['password'] = values.password.trim();
      send['currentPassword'] = values.currentPassword;
    }

    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', send);

    if (!data && error) {
      if (ApiError.check(error, 1039)) {
        form.setFieldError('username', error.error);
      } else if (ApiError.check(error, 1066) || ApiError.check(error, 1067)) {
        form.setFieldError('currentPassword', error.error);
      } else {
        notifications.show({
          title: 'Error while updating user',
          message: error.error,
          color: 'red',
          icon: <IconUserCancel size='1rem' />,
        });
      }

      return;
    }

    if (!data?.user) return;

    form.setFieldValue('password', '');
    form.setFieldValue('currentPassword', '');

    mutate('/api/user');
    mutate('/api/user/token');
    setUser(data.user);
    notifications.show({
      message: 'User updated',
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>User</Title>
      <Text c='dimmed' size='sm' mb='sm'>
        {user.id}
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
        {form.values.password && (
          <PasswordInput
            label='Current password'
            description='Required to change your password.'
            autoComplete='current-password'
            {...form.getInputProps('currentPassword')}
            leftSection={<IconAsteriskSimple size='1rem' />}
          />
        )}

        <Button type='submit' mt='md' leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
