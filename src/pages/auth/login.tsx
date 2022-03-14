import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import useFetch from 'hooks/useFetch';
import { useForm } from '@mantine/hooks';
import { TextInput, Button, Center, Title, Box, Badge, Tooltip } from '@mantine/core';
import { useNotifications } from '@mantine/notifications';
import { Cross1Icon, DownloadIcon } from '@modulz/radix-icons';

export default function Login() {
  const router = useRouter();
  const notif = useNotifications();
  const [versions, setVersions] = React.useState<{ upstream: string, local: string }>(null);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async values => {
    const username = values.username.trim();
    const password = values.password.trim();

    if (username === '') return form.setFieldError('username', 'Username can\'t be nothing');

    const res = await useFetch('/api/auth/login', 'POST', {
      username, password,
    });

    if (res.error) {
      notif.showNotification({
        title: 'Login Failed',
        message: res.error,
        color: 'red',
        icon: <Cross1Icon />,
      });
    } else {
      await router.push(router.query.url as string || '/dashboard');
    }
  };

  useEffect(() => {
    (async () => {
      const a = await fetch('/api/user');
      if (a.ok) await router.push('/dashboard');
      else {
        const v = await useFetch('/api/version');
        setVersions(v);
        if (v.local !== v.upstream) {
          notif.showNotification({
            title: 'Update available',
            message: `A new version of Zipline is available. You are running ${v.local} and the latest version is ${v.upstream}.`,
            icon: <DownloadIcon />,
          });
        }
      }
    })();
  }, []);

  return (
    <>
      <Center sx={{ height: '100vh' }}>
        <div>
          <Title align='center'>Zipline</Title>
          <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
            <TextInput size='lg' id='username' label='Username' {...form.getInputProps('username')} />
            <TextInput size='lg' id='password' label='Password' type='password' {...form.getInputProps('password')} />

            <Button size='lg' type='submit' fullWidth mt={12}>Login</Button>
          </form>
        </div>
      </Center>
      <Box
        sx={{
          zIndex: 99,
          position: 'fixed',
          bottom: '10px',
          right: '20px',

        }}
      >
        {versions && (
          <Tooltip
            wrapLines
            width={220}
            transition='rotate-left'
            transitionDuration={200}
            label={versions.local !== versions.upstream ? 'Looks like you are running an outdated version of Zipline. Please update to the latest version.' : 'You are running the latest version of Zipline.'}
          >
            <Badge radius='md' size='lg' variant='dot' color={versions.local !== versions.upstream ? 'red' : 'primary'}>{versions.local}</Badge>
          </Tooltip>
        )}
      </Box>
    </>
  );
}

Login.title = 'Zipline - Login';