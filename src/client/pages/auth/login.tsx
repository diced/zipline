import ExternalAuthButton from '@/components/pages/login/ExternalAuthButton';
import LocalLogin from '@/components/pages/login/LocalLogin';
import PasskeyAuthButton from '@/components/pages/login/PasskeyAuthButton';
import SecureWarningModal from '@/components/pages/login/SecureWarningModal';
import TotpModal from '@/components/pages/login/TotpModal';
import { getWebClient } from '@/lib/api/detect';
import { ApiError } from '@/lib/api/errors';
import { fetchApi } from '@/lib/fetchApi';
import useLogin from '@/lib/client/hooks/useLogin';
import useObjectState from '@/lib/client/hooks/useObjectState';
import { useTitle } from '@/lib/client/hooks/useTitle';
import {
  Anchor,
  Box,
  Center,
  Divider,
  Group,
  Image,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogleFilled,
  IconCheck,
  IconCircleKeyFilled,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import GenericError from '../../error/GenericError';
import { eitherTrue } from '@/lib/primitive';

export default function Login() {
  useTitle('Login');

  const query = new URLSearchParams(location.search);
  const navigate = useNavigate();
  const { user, mutate } = useLogin({
    swrConfig: {
      shouldRetryOnError: false,
    },
  });

  const isHttps = window.location.protocol === 'https:';
  const webClient = JSON.stringify(getWebClient());

  const { data: config, error: configError, isLoading: configLoading } = useSWR('/api/server/public');

  const showLocalLogin =
    query.get('local') === 'true' ||
    !(
      config?.oauth?.bypassLocalLogin &&
      Object.values(config?.oauthEnabled ?? {}).filter((x) => x === true).length > 0
    );

  const willRedirect =
    config?.oauth?.bypassLocalLogin &&
    Object.values(config?.oauthEnabled ?? {}).filter((x) => x === true).length === 1 &&
    query.get('local') !== 'true';

  useEffect(() => {
    if (willRedirect && config) {
      const provider = Object.keys(config.oauthEnabled).find(
        (x) => config.oauthEnabled[x as keyof typeof config.oauthEnabled] === true,
      );

      if (provider) window.location.href = `/api/auth/oauth/${provider.toLowerCase()}`;
    }
  }, [willRedirect, config]);

  const [totp, setTotp] = useObjectState({
    open: false,
    disabled: false,
    error: '',
    pin: '',
  });

  const [secureModal, setSecureModal] = useState(false);

  const form = useForm({
    initialValues: { username: '', password: '' },
    validate: {
      username: (v) => (v.length >= 1 ? null : 'Username is required'),
      password: (v) => (v.length >= 1 ? null : 'Password is required'),
    },
  });

  useEffect(() => {
    if (user) navigate('/dashboard');
    if (config?.firstSetup) navigate('/auth/setup');
  }, [user, config, navigate]);

  const handleLoginSubmit = async (values: any, code?: string) => {
    setTotp({ disabled: true, error: '' });

    const { data, error } = await fetchApi(
      '/api/auth/login',
      'POST',
      { ...values, code },
      { 'x-zipline-client': webClient },
    );

    if (error) {
      if (ApiError.check(error, 1044)) {
        form.setFieldError('username', 'Invalid username');
        form.setFieldError('password', 'Invalid password');
      } else {
        setTotp('error', error.error || 'Login failed');
      }
      setTotp('disabled', false);
    } else if (data?.totp) {
      setTotp({ open: true, disabled: false });
    } else {
      showNotification({
        message: 'Logging in...',
        icon: <IconCheck size='1rem' />,
        autoClose: 700,
      });
      mutate(data);
    }
  };

  const handleTotpChange = async (val: string) => {
    setTotp('pin', val);

    if (val.length === 6) await handleLoginSubmit(form.values, val);
  };

  if (configLoading || !config) return <LoadingOverlay visible />;
  if (configError) return <GenericError title='Error' message='Config load failed' details={configError} />;

  const hasBg = !!config.website.loginBackground;

  return (
    <>
      {willRedirect && !showLocalLogin && <LoadingOverlay visible />}

      <TotpModal
        state={totp}
        onPinChange={(val) => handleTotpChange(val)}
        onVerify={() => handleLoginSubmit(form.values, totp.pin)}
        onCancel={() => {
          setTotp('open', false);
          form.reset();
        }}
      />

      <SecureWarningModal
        opened={secureModal}
        onClose={() => setSecureModal(false)}
        returnHttps={config.returnHttps}
      />

      {isHttps && !config.returnHttps && (
        <Box pos='absolute' top={10} left='50%' style={{ transform: 'translateX(-50%)' }}>
          <Text size='sm' c='red' ta='center'>
            You are accessing this instance through a <b>secure</b> context but the server is not configured
            to use HTTPS. Click <Anchor onClick={() => setSecureModal(true)}> here</Anchor> to learn more.
          </Text>
        </Box>
      )}

      {!isHttps && config.returnHttps && (
        <Box pos='absolute' top={10} left='50%' style={{ transform: 'translateX(-50%)' }}>
          <Text size='sm' c='red' ta='center'>
            You are accessing this instance through an <b>insecure</b> context but the server is configured to
            use HTTPS. This may cause issues when logging in. Click{' '}
            <Anchor onClick={() => setSecureModal(true)}> here</Anchor> to learn more.
          </Text>
        </Box>
      )}

      <Center h='100vh'>
        {hasBg && (
          <Image
            src={config.website.loginBackground}
            pos='absolute'
            inset={0}
            w='100%'
            h='100%'
            fit='cover'
            style={{ filter: config.website.loginBackgroundBlur ? 'blur(10px)' : undefined }}
          />
        )}

        <Paper
          w='350px'
          p='xl'
          shadow='xl'
          withBorder
          pos='relative'
          style={{
            backgroundColor: hasBg ? 'transparent' : undefined,
            backdropFilter: hasBg ? 'blur(35px)' : undefined,
          }}
        >
          <Title order={1} ta='center' mb='md'>
            <b>{config.website.title ?? 'Zipline'}</b>
          </Title>

          <Stack>
            {showLocalLogin && (
              <LocalLogin
                form={form}
                onSubmit={handleLoginSubmit}
                loading={totp.disabled}
                hasBackground={hasBg}
              />
            )}

            {eitherTrue(
              config.mfa.passkeys && browserSupportsWebAuthn(),
              config.oauthEnabled.discord,
              config.oauthEnabled.github,
              config.oauthEnabled.google,
              config.oauthEnabled.oidc,
              config.features.userRegistration,
            ) && (
              <>
                <Divider label='or' />

                {config.mfa.passkeys && browserSupportsWebAuthn() && (
                  <PasskeyAuthButton onAuthSuccess={mutate} />
                )}

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

                {config.features.userRegistration && (
                  <Text ta='center' mt='md'>
                    Don&apos;t have an account?{' '}
                    <Anchor component={Link} to='/auth/register' c='blue' fw={500}>
                      Register
                    </Anchor>
                  </Text>
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Center>
    </>
  );
}
