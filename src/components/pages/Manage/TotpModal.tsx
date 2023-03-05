import { Button, Center, Image, Modal, PinInput, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { Icon2fa, IconBarcodeOff, IconCheck } from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';
import { useEffect, useState } from 'react';

export function TotpModal({ opened, onClose, deleteTotp, setTotpEnabled }) {
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (opened && !deleteTotp) {
        const data = await useFetch('/api/user/mfa/totp');
        if (!data.data_url) {
          onClose();
          showNotification({
            title: 'Error',
            message: "Can't generate code as you are already using MFA",
            color: 'red',
            icon: <IconBarcodeOff />,
          });
        } else {
          setSecret(data.secret);
          setQrCode(data.data_url);
          setError('');
        }
      }
    })();
  }, [opened]);

  const disableTotp = async (code) => {
    setDisabled(true);
    if (code.length !== 6) {
      setDisabled(false);
      return setError('Code must be 6 digits');
    }

    const resp = await useFetch('/api/user/mfa/totp', 'DELETE', {
      code,
    });

    if (resp.error) {
      setError(resp.error);
    } else {
      showNotification({
        title: 'Success',
        message: 'Successfully disabled 2FA',
        color: 'green',
        icon: <Icon2fa />,
      });

      setTotpEnabled(false);

      onClose();
    }

    setDisabled(false);
  };

  const verifyCode = async (code) => {
    setDisabled(true);
    if (code.length !== 6) {
      setDisabled(false);
      return setError('Code must be 6 digits');
    }

    const resp = await useFetch('/api/user/mfa/totp', 'POST', {
      secret,
      code,
      register: true,
    });

    if (resp.error) {
      setError(resp.error);
    } else {
      showNotification({
        title: 'Success',
        message: 'Successfully enabled 2FA',
        color: 'green',
        icon: <Icon2fa />,
      });

      setTotpEnabled(true);

      onClose();
    }

    setDisabled(false);
  };

  const handlePinChange = (value) => {
    if (value.length === 6) {
      setDisabled(true);
      deleteTotp ? disableTotp(value) : verifyCode(value);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>Two-Factor Authentication</Title>}
      size='lg'
    >
      {deleteTotp ? (
        <Text mb='md'>Verify your code to disable Two-Factor Authentication</Text>
      ) : (
        <>
          <Text mb='md'>
            Scan the QR Code below in <b>Authy</b>, <b>Google Authenticator</b>, or any other supported
            client.
          </Text>
          <Center>
            <Image height={180} width={180} src={qrCode} alt='QR Code' withPlaceholder />
          </Center>
        </>
      )}

      <Center my='md'>
        <PinInput
          data-autofocus
          length={6}
          oneTimeCode
          type='number'
          placeholder=''
          onChange={handlePinChange}
          autoFocus={true}
          error={!!error}
          disabled={disabled}
          size='xl'
        />
      </Center>

      {error && (
        <Text my='sm' size='sm' color='red' align='center'>
          {error}
        </Text>
      )}

      {!deleteTotp && (
        <Text my='sm' size='sm' color='gray' align='center'>
          QR Code not working? Try manually entering the code into your app: {secret}
        </Text>
      )}

      <Button
        disabled={disabled}
        size='lg'
        fullWidth
        mt='md'
        rightIcon={<IconCheck size='1rem' />}
        type='submit'
      >
        Verify{deleteTotp ? ' and Disable' : ''}
      </Button>
    </Modal>
  );
}
