import { Response } from '@/lib/api/response';
import { User } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/store/user';
import {
  Anchor,
  Box,
  Button,
  Center,
  Group,
  Image,
  LoadingOverlay,
  Modal,
  Paper,
  PinInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconShieldLockFilled } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';

export default function SettingsMfa() {
  const [user, setUser] = useUserStore((state) => [state.user, state.setUser]);

  const [totpOpen, setTotpOpen] = useState(false);
  const {
    data: twoData,
    error: twoError,
    isLoading: twoLoading,
  } = useSWR<Extract<Response['/api/user/mfa/totp'], { secret: string; qrcode: string }>>(
    totpOpen && !user?.totpSecret ? '/api/user/mfa/totp' : null,
    null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  const [pinDisabled, setPinDisabled] = useState(false);
  const [pinError, setPinError] = useState('');

  const enable2fa = async (pin: string) => {
    if (pin.length !== 6) return setPinError('Invalid pin');

    const { data, error } = await fetchApi<Extract<Response['/api/user/mfa/totp'], User>>(
      '/api/user/mfa/totp',
      'POST',
      {
        code: pin,
        secret: twoData!.secret,
      }
    );

    if (error) {
      setPinError(error.message!);
      setPinDisabled(false);
    } else {
      setTotpOpen(false);
      setPinDisabled(false);
      mutate('/api/user');
      setUser(data);

      notifications.show({
        title: '2FA Enabled',
        message: 'You have successfully enabled 2FA on your account.',
        color: 'green',
        icon: <IconShieldLockFilled size='1rem' />,
      });
    }
  };

  const disable2fa = async (pin: string) => {
    if (pin.length !== 6) return setPinError('Invalid pin');

    const { data, error } = await fetchApi<Extract<Response['/api/user/mfa/totp'], User>>(
      '/api/user/mfa/totp',
      'DELETE',
      {
        code: pin,
      }
    );

    if (error) {
      setPinError(error.message!);
      setPinDisabled(false);
    } else {
      setTotpOpen(false);
      setPinDisabled(false);
      mutate('/api/user');
      setUser(data);

      notifications.show({
        title: '2FA Disabled',
        message: 'You have successfully disabled 2FA on your account.',
        color: 'green',
        icon: <IconShieldLockFilled size='1rem' />,
      });
    }
  };

  const handlePinChange = (value: string) => {
    if (value.length === 6) {
      setPinDisabled(true);
      user?.totpSecret ? disable2fa(value) : enable2fa(value);
    } else {
      setPinError('');
    }
  };

  return (
    <>
      <Modal title={<Title>Enable 2FA</Title>} opened={totpOpen} onClose={() => setTotpOpen(false)}>
        <Stack spacing='sm'>
          {user?.totpSecret ? (
            <Text size='sm' color='dimmed'>
              Enter the 6-digit code from your authenticator app below to confirm disabling 2FA.
            </Text>
          ) : (
            <>
              <Text size='sm' color='dimmed'>
                <b>Step 1</b> Open/download an authenticator that supports qrcode scanning or manual code
                entry. Popular options include{' '}
                <Anchor component={Link} href='https://authy.com/' target='_blank'>
                  Authy
                </Anchor>
                ,{' '}
                <Anchor
                  component={Link}
                  href='https://support.google.com/accounts/answer/1066447'
                  target='_blank'
                >
                  Google Authenticator
                </Anchor>
                , and{' '}
                <Anchor
                  component={Link}
                  href='https://www.microsoft.com/en-us/security/mobile-authenticator-app'
                  target='_blank'
                >
                  Microsoft Authenticator
                </Anchor>
                .
              </Text>

              <Text size='sm' color='dimmed'>
                <b>Step 2</b> Scan the QR code below with your authenticator app to enable 2FA.
              </Text>

              <Box pos='relative'>
                {twoLoading && !twoError ? (
                  <LoadingOverlay visible />
                ) : (
                  <Center>
                    <Image
                      width={180}
                      height={180}
                      src={twoData?.qrcode}
                      alt={'qr code ' + twoData?.secret ?? ''}
                    />
                  </Center>
                )}
              </Box>

              <Text size='sm' color='dimmed'>
                If you can't scan the QR code, you can manually enter the following code into your
                authenticator app: <br /> {twoData?.secret ?? ''}
              </Text>

              <Text size='sm' color='dimmed'>
                <b>Step 3</b> Enter the 6-digit code from your authenticator app below to confirm 2FA setup.
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
              size='xl'
            />
          </Center>
          {pinError && (
            <Text align='center' size='sm' color='red' mt={0}>
              {pinError}
            </Text>
          )}
        </Stack>
      </Modal>

      <Paper withBorder p='sm'>
        <Title order={2}>Multi-Factor Authentication</Title>
        <Text size='sm' color='dimmed' mt={3}>
          Setup 2FA to protect your account with an additional layer of security.
        </Text>

        <Group mt='xs'>
          <Button
            size='sm'
            leftIcon={<IconShieldLockFilled size={24} />}
            color={user?.totpSecret ? 'red' : 'blue'}
            onClick={() => setTotpOpen(true)}
          >
            {user?.totpSecret ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </Group>
      </Paper>
    </>
  );
}
