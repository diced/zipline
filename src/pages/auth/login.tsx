import { Response } from '@/lib/api/response';
import { SafeConfig } from '@/lib/config/safe';
import { getZipline } from '@/lib/db/models/zipline';
import { fetchApi } from '@/lib/fetchApi';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { authenticateWeb } from '@/lib/passkey';
import { eitherTrue } from '@/lib/primitive';
import {
  Button,
  Card,
  Center,
  Group,
  LoadingOverlay,
  Modal,
  PasswordInput,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogle,
  IconCircleKeyFilled,
  IconKey,
  IconShieldQuestion,
  IconX,
} from '@tabler/icons-react';
import { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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

  const [totpOpen, setTotpOpen] = useState(false);
  const [pinDisabled, setPinDisabled] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pin, setPin] = useState('');

  const [passkeyErrored, setPasskeyErrored] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

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

  const onSubmit = async (values: typeof form.values, code: string | undefined = undefined) => {
    setPinDisabled(true);
    setPinError('');

    const { username, password } = values;

    const { data, error } = await fetchApi<Response['/api/auth/login']>('/api/auth/login', 'POST', {
      username,
      password,
      code,
    });

    if (error) {
      if (error.username) form.setFieldError('username', 'Invalid username');
      else if (error.password) form.setFieldError('password', 'Invalid password');
      else if (error.code) setPinError(error.message!);
      setPinDisabled(false);
    } else {
      if (data!.totp) {
        setTotpOpen(true);
        setPinDisabled(false);
        return;
      }

      mutate(data as Response['/api/user']);
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value);

    if (value.length === 6) {
      onSubmit(form.values, value);
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      setPasskeyLoading(true);
      const res = await authenticateWeb();

      const { data, error } = await fetchApi<Response['/api/auth/webauthn']>('/api/auth/webauthn', 'POST', {
        auth: res.toJSON(),
      });
      if (error) {
        setPasskeyErrored(true);
        setPasskeyLoading(false);
        notifications.show({
          title: 'Error while authenticating with passkey',
          message: error.message,
          color: 'red',
        });
      } else {
        mutate(data as Response['/api/user']);
      }
    } catch (e) {
      setPasskeyErrored(true);
      setPasskeyLoading(false);
    }
  };

  useEffect(() => {
    if (willRedirect) {
      const provider = Object.keys(config.oauthEnabled).find(
        (x) => config.oauthEnabled[x as keyof SafeConfig['oauthEnabled']] === true,
      );

      if (provider) {
        router.push(`/api/auth/oauth/${provider}`);
      }
    }
  }, []);

  // remove setpasskeyerrored after 3 seconds
  useEffect(() => {
    if (passkeyErrored) {
      setTimeout(() => {
        setPasskeyErrored(false);
      }, 3000);
    }
  }, [passkeyErrored]);

  return (
    <>
      {willRedirect && !showLocalLogin && <LoadingOverlay visible />}

      <Modal
        onClose={() => {}}
        title={<Title order={3}>Enter code</Title>}
        opened={totpOpen}
        withCloseButton={false}
      >
        <Center>
          <PinInput
            data-autofocus
            length={6}
            oneTimeCode
            type='number'
            placeholder=''
            onChange={handlePinChange}
            autoFocus={true}
            error={!!pinError}
            disabled={pinDisabled}
            size='xl'
          />
        </Center>
        {pinError && (
          <Text align='center' size='sm' color='red' mt={0}>
            {pinError}
          </Text>
        )}

        <Group mt='sm' grow>
          <Button
            leftIcon={<IconX size='1rem' />}
            color='red'
            variant='outline'
            onClick={() => {
              setTotpOpen(false);
              form.reset();
            }}
          >
            Cancel login attempt
          </Button>
          <Button
            leftIcon={<IconShieldQuestion size='1rem' />}
            loading={pinDisabled}
            type='submit'
            onClick={() => onSubmit(form.values, pin)}
          >
            Verify
          </Button>
        </Group>
      </Modal>

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
              <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
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

            <Button
              onClick={handlePasskeyLogin}
              size='lg'
              fullWidth
              variant='outline'
              leftIcon={<IconKey size='1rem' />}
              color={passkeyErrored ? 'red' : 'primary'}
              loading={passkeyLoading}
            >
              Login with passkey
            </Button>

            {config.features.userRegistration && (
              <Button component={Link} href='/auth/register' size='lg' fullWidth variant='outline'>
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
