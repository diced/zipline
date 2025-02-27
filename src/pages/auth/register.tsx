import { Response } from '@/lib/api/response';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { Invite, inviteInviterSelect } from '@/lib/db/models/invite';
import { fetchApi } from '@/lib/fetchApi';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
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
import { notifications } from '@mantine/notifications';
import { IconPlus, IconX, IconUserPlus, IconLogin } from '@tabler/icons-react';
import { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';

export default function Register({ config, invite }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { code } = router.query as { code?: string };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        await router.push('/auth/login');
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      tos: false,
    },
    validate: {
      username: (value) => (value.length < 1 ? 'Username is required' : null),
      password: (value) => (value.length < 1 ? 'Password is required' : null),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const { username, password, tos } = values;

    if (tos === false && config.website.tos) {
      form.setFieldError('tos', 'You must agree to the Terms of Service to continue');
      return;
    }

    const { data, error } = await fetchApi<Response['/api/auth/register']>('/api/auth/register', 'POST', {
      username,
      password,
      code: code ?? undefined,
    });

    if (error) {
      if (error.error === 'Username is taken') form.setFieldError('username', 'Username is taken');
      else {
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
        message: `Your "${
          data!.user!.username
        }" account has been created, you will be redirected to the dashboard shortly.`,
        color: 'green',
        icon: <IconPlus size='1rem' />,
      });

      mutate('/api/user');
      await router.push('/dashboard');
    }
  };

  if (loading) return <LoadingOverlay visible />;

  return (
    <>
      <Center h='100vh'>
        {config.website.loginBackground && (
          <Image
            src={config.website.loginBackground}
            alt={config.website.loginBackground + ' failed to load'}
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
              size={(config.website.title ?? 'Zipline').length > 50 ? 20 : 50}
              ta='center'
              style={{ whiteSpace: 'normal' }}
            >
              <b>{config.website.title ?? 'Zipline'}</b>
            </Title>
          </div>

          {invite ? (
            <Text ta='center' size='sm' c='dimmed'>
              You have been invited to join <b>{config?.website?.title ?? 'Zipline'}</b> by{' '}
              <b>{invite.inviter!.username}</b>
            </Text>
          ) : null}

          <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack my='sm'>
              <TextInput
                size='md'
                placeholder='Enter your username...'
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
                      <Link href='/auth/tos' target='_blank'>
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
              href='/auth/login'
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
    </>
  );
}

export const getServerSideProps = withSafeConfig<{
  invite?: Invite | null;
}>(async (ctx) => {
  const { code } = ctx.query as { code?: string };

  if (!code) {
    if (!config.features.userRegistration)
      return {
        notFound: true,
      };

    return {
      invite: null,
    };
  }

  if (!config.invites.enabled)
    return {
      notFound: true,
    };

  const invite = await prisma.invite.findFirst({
    where: {
      OR: [{ id: code }, { code }],
    },
    select: {
      id: true,
      code: true,
      maxUses: true,
      expiresAt: true,
      uses: true,
      inviter: inviteInviterSelect,
    },
  });

  if (!invite)
    return {
      notFound: true,
    };

  if (invite.expiresAt && invite.expiresAt < new Date())
    return {
      notFound: true,
    };

  if (invite.maxUses && invite.maxUses <= invite.uses)
    return {
      notFound: true,
    };

  delete (invite as any).expiresAt;

  return {
    invite: invite as unknown as Invite,
  };
});

Register.title = 'Register';
