import { Response } from '@/lib/api/response';
import { config } from '@/lib/config';
import { SafeConfig } from '@/lib/config/safe';
import { getZipline } from '@/lib/db/models/zipline';
import { fetchApi } from '@/lib/fetchApi';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { eitherTrue, isTruthy } from '@/lib/primitive';
import {
  Button,
  Card,
  Center,
  LoadingOverlay,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogle,
  IconCircleKeyFilled,
} from '@tabler/icons-react';
import { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSWR from 'swr';

export default function Login({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<Response['/api/user']>('/api/user');

  const showLocalLogin =
    router.query.local === 'true' ||
    !(
      config.oauth.bypassLocalLogin && Object.values(config.oauthEnabled).filter((x) => x === true).length > 0
    );

  const willRedirect =
    config.oauth.bypassLocalLogin &&
    Object.values(config.oauthEnabled).filter((x) => x === true).length === 1 &&
    router.query.local !== 'true';

  useEffect(() => {
    if (data?.user) {
      router.push('/dashboard');
    }
  }, [data]);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: hasLength({ min: 1 }, 'Username is required'),
      password: hasLength({ min: 1 }, 'Password is required'),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const { username, password } = values;

    const { data, error } = await fetchApi<Response['/api/auth/login']>('/api/auth/login', 'POST', {
      username,
      password,
    });

    if (error) {
      if (error.username) form.setFieldError('username', 'Invalid username');
      else if (error.password) form.setFieldError('password', 'Invalid password');
    } else {
      mutate(data as Response['/api/user']);
    }
  };

  useEffect(() => {
    if (willRedirect) {
      const provider = Object.keys(config.oauthEnabled).find(
        (x) => config.oauthEnabled[x as keyof SafeConfig['oauthEnabled']] === true
      );

      if (provider) {
        router.push(`/api/auth/oauth/${provider}`);
      }
    }
  }, []);

  return (
    <>
      {willRedirect && !showLocalLogin && <LoadingOverlay visible />}

      <Center
        h='100vh'
        sx={
          config.website.loginBackground
            ? {
                backgroundImage: `url(${config.website.loginBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : undefined
        }
      >
        <Card
          p='xl'
          sx={(t) => ({
            backgroundColor: config.website.loginBackground ? t.fn.rgba('white', 0.1) : undefined,
            backdropFilter: config.website.loginBackground ? 'blur(25px)' : undefined,
          })}
          withBorder
        >
          <Title order={1} size={50} align='center'>
            <b>{config.website.title ?? 'Zipline'}</b>
          </Title>

          {showLocalLogin && (
            <>
              <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack my='sm'>
                  <TextInput
                    size='lg'
                    placeholder='Enter your username...'
                    styles={{
                      input: {
                        backgroundColor: config.website.loginBackground ? 'transparent' : undefined,
                      },
                    }}
                    {...form.getInputProps('username', { withError: true })}
                  />

                  <PasswordInput
                    size='lg'
                    placeholder='Enter your password...'
                    styles={{
                      input: {
                        backgroundColor: config.website.loginBackground ? 'transparent' : undefined,
                      },
                    }}
                    {...form.getInputProps('password')}
                  />

                  <Button
                    size='lg'
                    fullWidth
                    type='submit'
                    loading={isLoading}
                    variant={config.website.loginBackground ? 'outline' : 'filled'}
                  >
                    Login
                  </Button>
                </Stack>
              </form>
            </>
          )}

          <Stack my='xs'>
            {eitherTrue(config.features.oauthRegistration, config.features.userRegistration) && (
              <Text size='sm' align='center' color='dimmed'>
                or
              </Text>
            )}

            {config.features.userRegistration && (
              <Button size='lg' fullWidth variant='outline'>
                Sign up
              </Button>
            )}
            {config.oauthEnabled.discord && (
              <Button
                size='lg'
                fullWidth
                variant='filled'
                component={Link}
                href='/api/auth/oauth/discord'
                leftIcon={<IconBrandDiscordFilled />}
                color='discord.0'
                sx={(t) => ({
                  '&:hover': {
                    backgroundColor: t.fn.darken(t.colors.discord[0], 0.1),
                  },
                })}
              >
                Sign in with Discord
              </Button>
            )}
            {config.oauthEnabled.github && (
              <Button
                size='lg'
                fullWidth
                color='github.0'
                component={Link}
                href='/api/auth/oauth/github'
                leftIcon={<IconBrandGithubFilled />}
                sx={(t) => ({
                  '&:hover': {
                    backgroundColor: t.fn.darken(t.colors.github[0], 0.1),
                  },
                })}
              >
                Sign in with GitHub
              </Button>
            )}
            {config.oauthEnabled.google && (
              <Button
                size='lg'
                fullWidth
                component={Link}
                href='/api/auth/oauth/google'
                leftIcon={<IconBrandGoogle stroke={4} />}
                color='google.0'
                sx={(t) => ({
                  '&:hover': {
                    backgroundColor: t.fn.darken(t.colors.google[0], 0.1),
                  },
                })}
              >
                Sign in with Google
              </Button>
            )}
            {config.oauthEnabled.authentik && (
              <Button
                size='lg'
                fullWidth
                color='authentik.0'
                component={Link}
                href='/api/auth/oauth/authentik'
                leftIcon={<IconCircleKeyFilled />}
                sx={(t) => ({
                  '&:hover': {
                    backgroundColor: t.fn.darken(t.colors.authentik[0], 0.2),
                  },
                })}
              >
                Sign in with Authentik
              </Button>
            )}
          </Stack>
        </Card>
      </Center>
    </>
  );
}

export const getServerSideProps = withSafeConfig(async () => {
  const { firstSetup } = await getZipline();

  if (firstSetup)
    return {
      redirect: {
        destination: '/setup',
        permanent: false,
      },
    };

  return {};
});
