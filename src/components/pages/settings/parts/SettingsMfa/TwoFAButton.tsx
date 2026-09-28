import { Response } from '@/lib/api/response';
import { User } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/client/store/user';
import {
  Anchor,
  Box,
  Button,
  Center,
  Code,
  Image,
  LoadingOverlay,
  Modal,
  PinInput,
  Stack,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconShieldLockFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';

export default function TwoFAButton() {
  const { t } = useTranslation('settings');
  const size = useMediaQuery('(max-width: 600px)') ? 'sm' : 'xl';
  const [user, setUser] = useUserStore(useShallow((state) => [state.user, state.setUser]));

  const [totpOpen, setTotpOpen] = useState(false);
  const {
    data: mfaData,
    error: mfaError,
    isLoading: mfaLoading,
  } = useSWR<Extract<Response['/api/user/mfa/totp'], { secret: string; qrcode: string }>>(
    totpOpen && !user?.totpEnabled ? '/api/user/mfa/totp' : null,
    null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  );

  const [pinDisabled, setPinDisabled] = useState(false);
  const [pinError, setPinError] = useState('');

  const enable2fa = async (pin: string) => {
    if (pin.length !== 6) return setPinError(t('mfa.totp.invalidPin'));

    const { data, error } = await fetchApi<Extract<Response['/api/user/mfa/totp'], User>>(
      '/api/user/mfa/totp',
      'POST',
      {
        code: pin,
        secret: mfaData!.secret,
      },
    );

    if (error) {
      setPinError(error.error!);
      setPinDisabled(false);
    } else {
      setTotpOpen(false);
      setPinDisabled(false);
      mutate('/api/user');
      setUser(data);

      notifications.show({
        title: t('mfa.totp.notifications.enabled.title'),
        message: t('mfa.totp.notifications.enabled.message'),
        color: 'green',
        icon: <IconShieldLockFilled size='1rem' />,
      });
    }
  };

  const disable2fa = async (pin: string) => {
    if (pin.length !== 6) return setPinError(t('mfa.totp.invalidPin'));

    const { data, error } = await fetchApi<Extract<Response['/api/user/mfa/totp'], User>>(
      '/api/user/mfa/totp',
      'DELETE',
      {
        code: pin,
      },
    );

    if (error) {
      setPinError(error.error!);
      setPinDisabled(false);
    } else {
      setTotpOpen(false);
      setPinDisabled(false);
      mutate('/api/user');
      setUser(data);

      notifications.show({
        title: t('mfa.totp.notifications.disabled.title'),
        message: t('mfa.totp.notifications.disabled.message'),
        color: 'green',
        icon: <IconShieldLockFilled size='1rem' />,
      });
    }
  };

  const handlePinChange = (value: string) => {
    if (value.length === 6) {
      setPinDisabled(true);
      user?.totpEnabled ? disable2fa(value) : enable2fa(value);
    } else {
      setPinError('');
    }
  };

  return (
    <>
      <Modal
        title={user?.totpEnabled ? t('mfa.totp.modal.disableTitle') : t('mfa.totp.modal.enableTitle')}
        opened={totpOpen}
        onClose={() => setTotpOpen(false)}
        size='md'
      >
        <Stack gap='sm'>
          {user?.totpEnabled ? (
            <Text size='sm' c='dimmed'>
              {t('mfa.totp.modal.disableInstructions')}
            </Text>
          ) : (
            <>
              <Text size='sm' c='dimmed'>
                <Trans
                  t={t}
                  i18nKey='mfa.totp.modal.step1'
                  components={{
                    b: <b />,
                    twofas: <Anchor component={Link} to='https://2fas.com/' target='_blank' />,
                    google: (
                      <Anchor
                        component={Link}
                        to='https://support.google.com/accounts/answer/1066447'
                        target='_blank'
                      />
                    ),
                    microsoft: (
                      <Anchor
                        component={Link}
                        to='https://www.microsoft.com/en-us/security/mobile-authenticator-app'
                        target='_blank'
                      />
                    ),
                    apple: (
                      <Anchor
                        component={Link}
                        to='https://support.apple.com/guide/iphone/automatically-fill-in-verification-codes-ipha6173c19f/ios'
                        target='_blank'
                      />
                    ),
                  }}
                />
              </Text>

              <Text size='sm' c='dimmed'>
                <Trans t={t} i18nKey='mfa.totp.modal.step2' components={{ b: <b /> }} />
              </Text>

              <Box pos='relative'>
                {mfaLoading && !mfaError ? (
                  <Box w={180} h={180}>
                    <LoadingOverlay visible pos='relative' />
                  </Box>
                ) : (
                  <Center>
                    <Image
                      h={180}
                      w={180}
                      src={mfaData?.qrcode}
                      alt={t('mfa.totp.modal.qrAlt', { secret: mfaData?.secret ?? '' })}
                    />
                  </Center>
                )}
              </Box>

              <Text size='sm' c='dimmed'>
                <Trans
                  t={t}
                  i18nKey='mfa.totp.modal.manualEntry'
                  values={{ secret: mfaData?.secret ?? '' }}
                  components={{ code: <Code /> }}
                />
              </Text>

              <Text size='sm' c='dimmed'>
                <Trans t={t} i18nKey='mfa.totp.modal.step3' components={{ b: <b /> }} />
              </Text>
            </>
          )}

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
              size={size}
            />
          </Center>
          {pinError && (
            <Text ta='center' size='sm' c='red' mt={0}>
              {pinError}
            </Text>
          )}
        </Stack>
      </Modal>

      <Button
        size='sm'
        leftSection={<IconShieldLockFilled size='1rem' />}
        color={user?.totpEnabled ? 'red' : undefined}
        onClick={() => setTotpOpen(true)}
      >
        {user?.totpEnabled ? t('mfa.totp.disable') : t('mfa.totp.enable')}
      </Button>
    </>
  );
}
