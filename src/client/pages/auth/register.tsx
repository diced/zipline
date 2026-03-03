import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useTitle } from '@/lib/hooks/useTitle';
import {
  Button,
  Center,
  Checkbox,
  Divider,
  Image,
  LoadingOverlay,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications, showNotification } from '@mantine/notifications';
import { IconLogin, IconPlus, IconUserPlus, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import GenericError from '../../error/GenericError';
import { getWebClient } from '@/lib/api/detect';
import { ApiError } from '@/lib/api/errors';

export function Component() {
  useTitle('Register');

  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const {
    data: config,
    error: configError,
    isLoading: configLoading,
  } = useSWR<Response['/api/server/public']>('/api/server/public', {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    revalidateIfStale: false,
  });

  const code = new URLSearchParams(location.search).get('code') ?? undefined;
  const {
    data: invite,
    error: inviteError,
    isLoading: inviteLoading,
  } = useSWR<Response['/api/auth/invites/web']>(
    location.search.includes('code') ? `/api/auth/invites/web${location.search}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      revalidateIfStale: false,
    },
  );

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      tos: false,
    },
    validate: {
      username: (value) => (value.length >= 1 ? null : 'Username is required'),
      password: (value) => (value.length >= 1 ? null : 'Password is required'),
    },
    enhanceGetInputProps: ({ field }) => ({
      name: field,
    }),
  });

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/user');
      if (res.ok) {
        navigate('/dashboard');
      } else {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!config) return;

    if (!config?.features.userRegistration && !code) {
      navigate('/auth/login');
    }
  }, [code, config]);

  const onSubmit = async (values: typeof form.values) => {
    const { username, password, tos } = values;

    if (tos === false && config!.website.tos) {
      form.setFieldError('tos', 'You must agree to the Terms of Service to continue');
      return;
    }

    const { data, error } = await fetchApi(
      '/api/auth/register',
      'POST',
      {
        username,
        password,
        code,
      },
      {
        'x-zipline-client': JSON.stringify(getWebClient()),
      },
    );

    if (error) {
      if (ApiError.check(error, 1039)) {
        form.setFieldError('username', 'Username is taken');
      } else {
        notifications.show({
          title: 'Failed to register',
          message: error.error,
          color: 'red',
          icon: <IconX size='1rem' />,
        });
      }
    } else {
      notifications.show({
        title: 'Complete!',
        message: `Your "${data?.user?.username}" account has been created.`,
        color: 'green',
        icon: <IconPlus size='1rem' />,
      });

      mutate('/api/user');
      navigate('/dashboard');
    }
  };

  if (loading || configLoading) return <LoadingOverlay visible />;

  if (!config || configError) {
    return (
      <GenericError
        title='Error loading configuration'
        message='Could not load server configuration...'
        details={configError}
      />
    );
  }

  if (code && inviteError) {
    if (inviteError) {
      showNotification({
        id: 'invalid-invite',
        message: 'Invalid or expired invite. Please try again later.',
        color: 'red',
      });

      navigate('/auth/login');

      return null;
    }

    if (inviteLoading) return <LoadingOverlay visible />;
  }

  return (
    <Center h='100vh'>
      {config.website.loginBackground && (
        <Image
          src={config.website.loginBackground}
          alt='Background'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...(config.website.loginBackgroundBlur && { filter: 'blur(10px)' }),
          }}
        />
      )}

      <Paper
        w='350px'
        p='xl'
        shadow='xl'
        withBorder
        style={{
          backgroundColor: config.website.loginBackground ? 'rgba(0, 0, 0, 0)' : undefined,
          backdropFilter: config.website.loginBackgroundBlur ? 'blur(35px)' : undefined,
        }}
      >
        <div style={{ width: '100%', overflowWrap: 'break-word' }}>
          <Title
            order={1}
            ta='center'
            style={{
              whiteSpace: 'normal',
              fontSize: `clamp(20px, ${Math.max(50 - (config.website.title?.length ?? 0) / 2, 20)}px, 50px)`,
            }}
          >
            <b>{config.website.title ?? 'Zipline'}</b>
          </Title>
        </div>

        {invite && (
          <Text ta='center' size='sm' c='dimmed'>
            You’ve been invited to join <b>{config?.website?.title ?? 'Zipline'}</b>
            {invite.inviter && (
              <>
                {' '}
                by <b>{invite.inviter.username}</b>
              </>
            )}
          </Text>
        )}

        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack my='sm'>
            <TextInput
              size='md'
              placeholder='Enter your username...'
              autoComplete='username'
              styles={{
                input: {
                  backgroundColor: config.website.loginBackground ? 'transparent' : undefined,
                },
              }}
              {...form.getInputProps('username', { withError: true })}
            />

            <PasswordInput
              size='md'
              placeholder='Enter your password...'
              autoComplete='new-password'
              styles={{
                input: {
                  backgroundColor: config.website.loginBackground ? 'transparent' : undefined,
                },
              }}
              {...form.getInputProps('password')}
            />

            {config.website.tos && (
              <Checkbox
                label={
                  <Text size='xs'>
                    I agree to the{' '}
                    <Link to='/auth/tos' target='_blank'>
                      Terms of Service
                    </Link>
                  </Text>
                }
                required
                {...form.getInputProps('tos', { type: 'checkbox' })}
              />
            )}

            <Button
              size='md'
              fullWidth
              type='submit'
              variant={config.website.loginBackground ? 'outline' : 'filled'}
              leftSection={<IconUserPlus size='1rem' />}
            >
              Register
            </Button>
          </Stack>
        </form>

        <Stack my='xs'>
          <Divider label='or' />
          <Button
            component={Link}
            to='/auth/login'
            size='md'
            fullWidth
            variant='outline'
            leftSection={<IconLogin size='1rem' />}
          >
            Login
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}

Component.displayName = 'Register';
