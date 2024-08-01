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
  LoadingOverlay,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconX } from '@tabler/icons-react';
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
      username: hasLength({ min: 1 }, 'Username is required'),
      password: hasLength({ min: 1 }, 'Password is required'),
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
      if (error.message === 'Username is taken') form.setFieldError('username', 'Username is taken');
      else {
        notifications.show({
          title: 'Failed to register',
          message: error.message,
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
        <Paper withBorder p='sm'>
          {invite && (
            <div>
              <Title order={4} fw={500}>
                You have been invited to join <b>{config.website.title}</b> by{' '}
                <b>{invite.inviter!.username}</b>
              </Title>
            </div>
          )}

          <Text size='sm' c='dimmed'>
            Create an account to get started.
          </Text>

          <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack gap='sm'>
              <TextInput label='Username' placeholder='Username' {...form.getInputProps('username')} />
              <PasswordInput label='Password' placeholder='Password' {...form.getInputProps('password')} />

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

              <Button type='submit' fullWidth leftSection={<IconPlus size='1rem' />}>
                Register
              </Button>
            </Stack>
          </form>
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
