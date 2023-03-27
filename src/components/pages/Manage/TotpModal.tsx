import { Button, Center, Image, Modal, NumberInput, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CheckIcon, CrossIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';
import { useEffect, useState } from 'react';

export function TotpModal({ opened, onClose, deleteTotp, setTotpEnabled }) {
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [code, setCode] = useState(undefined);
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
            icon: <CrossIcon />,
          });
        } else {
          setSecret(data.secret);
          setQrCode(data.data_url);
          setError('');
        }
      }
    })();
  }, [opened]);

  const disableTotp = async () => {
    setDisabled(true);
    const str = code.toString();
    if (str.length !== 6) {
      return setError('Code must be 6 digits');
    }

    const resp = await useFetch('/api/user/mfa/totp', 'DELETE', {
      code: str,
    });

    if (resp.error) {
      setError(resp.error);
    } else {
      showNotification({
        title: 'Success',
        message: 'Successfully disabled MFA',
        color: 'green',
        icon: <CheckIcon />,
      });

      setTotpEnabled(false);

      onClose();
    }

    setDisabled(false);
  };

  const verifyCode = async () => {
    setDisabled(true);
    const str = code.toString();
    if (str.length !== 6) {
      return setError('Code must be 6 digits');
    }

    const resp = await useFetch('/api/user/mfa/totp', 'POST', {
      secret,
      code: str,
      register: true,
    });

    if (resp.error) {
      setError(resp.error);
    } else {
      showNotification({
        title: 'Success',
        message: 'Successfully enabled MFA',
        color: 'green',
        icon: <CheckIcon />,
      });

      setTotpEnabled(true);

      onClose();
    }

    setDisabled(false);
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
          <Text my='sm'>QR Code not working? Try manually entering the code into your app: {secret}</Text>
        </>
      )}

      <NumberInput
        placeholder='2FA Code'
        label='Verify'
        size='xl'
        hideControls
        maxLength={6}
        minLength={6}
        value={code}
        onChange={(e) => setCode(e)}
        error={error}
      />

      <Button
        disabled={disabled}
        size='lg'
        fullWidth
        mt='md'
        rightIcon={<CheckIcon />}
        onClick={deleteTotp ? disableTotp : verifyCode}
      >
        Verify{deleteTotp ? ' and Disable' : ''}
      </Button>
    </Modal>
  );
}
