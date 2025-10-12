import ExternalAuthButton from '@/components/pages/login/ExternalAuthButton';
import { Response } from '@/lib/api/response';
import { SafeConfig } from '@/lib/config/safe';
import { getZipline } from '@/lib/db/models/zipline';
import { fetchApi } from '@/lib/fetchApi';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { authenticateWeb } from '@/lib/passkey';
import { eitherTrue } from '@/lib/primitive';
import {
  Avatar,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Image,
  LoadingOverlay,
  Modal,
  Paper,
  PasswordInput,
  PinInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications, showNotification } from '@mantine/notifications';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogleFilled,
  IconCircleKeyFilled,
  IconCloudUpload,
  IconKey,
  IconLock,
  IconShieldQuestion,
  IconUser,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

export default function Login({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<Response['/api/user']>('/api/user', {
    refreshInterval: 120000,
  });

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
      router.push('/');
    }
  }, [data]);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => (value.length > 1 ? null : 'Username is required'),
      password: (value) => (value.length > 1 ? null : 'Password is required'),
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
      if (error.error === 'Invalid username') form.setFieldError('username', 'Invalid username');
      else if (error.error === 'Invalid password') form.setFieldError('password', 'Invalid password');
      else if (error.error === 'Invalid code') setPinError(error.error!);
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
          message: error.error,
          color: 'red',
        });
      } else {
        mutate(data as Response['/api/user']);
      }
    } catch (e) {
      console.log(e);
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

  useEffect(() => {
    if (passkeyErrored) {
      setTimeout(() => {
        setPasskeyErrored(false);
      }, 3000);

      showNotification({
        title: 'Error while authenticating with passkey',
        message: 'Please try again',
        color: 'red',
        icon: <IconX size='1rem' />,
      });
    }
  }, [passkeyErrored]);

  return (
    <>
      {willRedirect && !showLocalLogin && <LoadingOverlay visible />}

      <Modal
        onClose={() => {}}
        title={
          <Group gap='xs'>
            <ThemeIcon variant='light' size='lg' radius='md'>
              <IconShieldQuestion size='1.2rem' />
            </ThemeIcon>
            <Text size='lg' fw={600}>
              Two-Factor Authentication
            </Text>
          </Group>
        }
        opened={totpOpen}
        withCloseButton={false}
        centered
        radius='lg'
        size='md'
      >
        <Stack gap='lg' mt='md'>
          <Text size='sm' c='dimmed' ta='center'>
            Enter the 6-digit code from your authenticator app
          </Text>
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
            <Text ta='center' size='sm' c='red' mt={0}>
              {pinError}
            </Text>
          )}

          <Group mt='sm' grow>
            <Button
              leftSection={<IconX size='1rem' />}
              color='red'
              variant='light'
              onClick={() => {
                setTotpOpen(false);
                form.reset();
              }}
              size='md'
            >
              Cancel
            </Button>
            <Button
              leftSection={<IconShieldQuestion size='1rem' />}
              loading={pinDisabled}
              type='submit'
              onClick={() => onSubmit(form.values, pin)}
              size='md'
              variant='gradient'
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              Verify
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {config.website.loginBackground ? (
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
        ) : (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)',
            }}
          />
        )}

        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: config.website.loginBackground ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(10px)',
          }}
        />

        <Container size='xs' style={{ position: 'relative', zIndex: 1 }}>
          <Paper
            p='xl'
            radius='xl'
            shadow='xl'
            style={{
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <Stack gap='lg' align='center' mb='xl'>
              {config.website.titleLogo ? (
                <Avatar src={config.website.titleLogo} alt='logo' size={100} />
              ) : (
                <ThemeIcon
                  size={100}
                  radius='xl'
                  variant='gradient'
                  gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                  style={{
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <IconCloudUpload size='3rem' />
                </ThemeIcon>
              )}

              <div style={{ width: '100%', overflowWrap: 'break-word' }}>
                <Title
                  order={1}
                  ta='center'
                  style={{
                    whiteSpace: 'normal',
                    fontSize: `clamp(24px, ${Math.max(50 - (config.website.title?.length ?? 0) / 2, 24)}px, 50px)`,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                  }}
                >
                  {config.website.title ?? 'Zipline'}
                </Title>
              </div>
            </Stack>

            {showLocalLogin && (
              <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
                <Stack gap='md'>
                  <TextInput
                    size='lg'
                    placeholder='Username'
                    leftSection={<IconUser size='1.2rem' style={{ color: 'rgba(255, 255, 255, 0.5)' }} />}
                    styles={{
                      input: {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        paddingLeft: '42px',
                        color: '#fff',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.4)',
                        },
                        '&:focus': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          borderColor: '#667eea',
                          boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.3)',
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.07)',
                        },
                      },
                    }}
                    {...form.getInputProps('username', { withError: true })}
                  />

                  <PasswordInput
                    size='lg'
                    placeholder='Password'
                    leftSection={<IconLock size='1.2rem' style={{ color: 'rgba(255, 255, 255, 0.5)' }} />}
                    styles={{
                      input: {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        paddingLeft: '42px',
                        color: '#fff',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.4)',
                        },
                        '&:focus': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          borderColor: '#667eea',
                          boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.3)',
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.07)',
                        },
                      },
                      visibilityToggle: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      },
                    }}
                    {...form.getInputProps('password')}
                  />

                  <Button
                    size='lg'
                    type='submit'
                    loading={isLoading}
                    variant='gradient'
                    gradient={{ from: 'gray', to: 'rgba(102, 126, 234, 0.4)', deg: 135 }}
                    radius='12px'
                    style={{
                      marginTop: '8px',
                      fontWeight: 600,
                      fontSize: '16px',
                      transition: 'all 0.3s ease rgba(102, 126, 234, 0.4)',
                      justifyContent: 'center',
                    }}
                  >
                    Login to Account
                  </Button>
                </Stack>
              </form>
            )}

            {(eitherTrue(config.features.oauthRegistration, config.features.userRegistration) ||
              config.mfa.passkeys ||
              Object.values(config.oauthEnabled).some((x) => x === true)) &&
              showLocalLogin && (
                <Divider
                  label={
                    <Text size='sm' fw={500} style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      OR CONTINUE WITH
                    </Text>
                  }
                  labelPosition='center'
                  my='xl'
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                />
              )}

            <Stack
              gap='md'
              style={{
                width: '20vw',
              }}
            >
              {config.mfa.passkeys && (
                <Button
                  onClick={handlePasskeyLogin}
                  size='lg'
                  fullWidth
                  variant='light'
                  leftSection={<IconKey size='1.2rem' />}
                  color={passkeyErrored ? 'red' : 'blue'}
                  loading={passkeyLoading}
                  radius='xl'
                  style={{
                    fontWeight: 500,
                    transition: 'all 0.3s ease',
                  }}
                >
                  Login with Passkey
                </Button>
              )}

              {config.features.userRegistration && (
                <Button
                  component={Link}
                  href='/auth/register'
                  size='lg'
                  fullWidth
                  variant='light'
                  color='violet'
                  leftSection={<IconUserPlus size='1.2rem' />}
                  radius='xl'
                  style={{
                    fontWeight: 500,
                    transition: 'all 0.3s ease',
                  }}
                >
                  Create New Account
                </Button>
              )}

              {Object.values(config.oauthEnabled).some((x) => x === true) && (
                <Group grow>
                  {config.oauthEnabled.discord && (
                    <ExternalAuthButton
                      provider='Discord'
                      leftSection={<IconBrandDiscordFilled stroke={4} size='1.1rem' />}
                    />
                  )}
                  {config.oauthEnabled.github && (
                    <ExternalAuthButton
                      provider='GitHub'
                      leftSection={<IconBrandGithubFilled size='1.1rem' />}
                    />
                  )}
                  {config.oauthEnabled.google && (
                    <ExternalAuthButton
                      provider='Google'
                      leftSection={<IconBrandGoogleFilled stroke={4} size='1.1rem' />}
                    />
                  )}
                  {config.oauthEnabled.oidc && (
                    <ExternalAuthButton provider='OIDC' leftSection={<IconCircleKeyFilled size='1.1rem' />} />
                  )}
                </Group>
              )}
            </Stack>
          </Paper>
        </Container>
      </Box>
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

Login.title = 'Login';
