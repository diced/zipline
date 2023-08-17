import RelativeDate from '@/components/RelativeDate';
import { User } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { registerWeb } from '@/lib/passkey';
import { useUserStore } from '@/lib/store/user';
import { RegistrationResponseJSON } from '@github/webauthn-json/dist/types/browser-ponyfill';
import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconKey, IconKeyOff, IconTrashFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';

export default function PasskeyButton() {
  const [user, setUser] = useUserStore((state) => [state.user, state.setUser]);

  const [passkeyOpen, setPasskeyOpen] = useState(false);
  const [passkeyErrored, setPasskeyErrored] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [namerShown, setNamerShown] = useState(false);
  const [savedKey, setSavedKey] = useState<RegistrationResponseJSON | null>(null);
  const [name, setName] = useState('');

  const handleRegisterPasskey = async () => {
    try {
      setPasskeyLoading(true);
      const res = await registerWeb(user!);
      setNamerShown(true);
      setSavedKey(res.toJSON());
    } catch (e) {
      setPasskeyErrored(true);
      setPasskeyLoading(false);
      setSavedKey(null);
    }
  };

  const handleSavePasskey = async () => {
    if (!savedKey) return;

    const { data, error } = await fetchApi('/api/user/mfa/passkey', 'POST', {
      reg: savedKey,
      name: name.trim(),
    });

    if (error) {
      setNamerShown(false);
      setPasskeyErrored(true);
      setPasskeyLoading(false);
      setSavedKey(null);

      notifications.show({
        title: 'Error while saving passkey',
        message: error.message,
        color: 'red',
        icon: <IconKeyOff size='1rem' />,
      });
    } else {
      setNamerShown(false);
      setPasskeyLoading(false);
      setSavedKey(null);
      setPasskeyOpen(false);

      notifications.show({
        title: 'Passkey saved!',
        message: 'Your passkey has been saved successfully.',
        color: 'green',
        icon: <IconKey size='1rem' />,
      });

      mutate('/api/user');
    }
  };

  const removePasskey = async (passkey: User['passkeys'][0]) => {
    modals.openConfirmModal({
      title: <Title>Are you sure?</Title>,
      children: `Your browser and device may still show "${passkey.name}" as an option to log in. If you want to remove it, you'll have to do so manually through your device's settings.`,
      labels: {
        confirm: `Remove "${passkey.name}"`,
        cancel: 'Cancel',
      },
      confirmProps: {
        color: 'red',
      },
      onConfirm: async () => {
        const { error } = await fetchApi('/api/user/mfa/passkey', 'DELETE', {
          id: passkey.id,
        });

        if (error) {
          notifications.show({
            title: 'Error while removing passkey',
            message: error.message,
            color: 'red',
            icon: <IconKeyOff size='1rem' />,
          });
        } else {
          notifications.show({
            title: 'Passkey removed!',
            message: 'Your passkey has been removed successfully.',
            color: 'green',
            icon: <IconKey size='1rem' />,
          });

          mutate('/api/user');
        }
      },
    });
  };

  useEffect(() => {
    if (passkeyErrored) {
      setTimeout(() => {
        setPasskeyErrored(false);
      }, 2500);
    }
  }, [passkeyErrored]);

  return (
    <>
      <Modal
        title={<Title>Manage passkeys</Title>}
        opened={passkeyOpen}
        onClose={() => setPasskeyOpen(false)}
      >
        <Stack spacing='sm'>
          <>
            {user?.passkeys.map((passkey) => (
              <Paper withBorder p='xs'>
                <Group position='apart'>
                  <Text weight='bolder'>{passkey.name}</Text>
                  <ActionIcon color='red' onClick={() => removePasskey(passkey)}>
                    <IconTrashFilled size='1rem' />
                  </ActionIcon>
                </Group>
                <Text size='sm'>
                  Passkey created <RelativeDate date={passkey.createdAt} />
                  {passkey.lastUsed && (
                    <>
                      , last used <RelativeDate date={passkey.lastUsed} />.
                    </>
                  )}
                </Text>
              </Paper>
            ))}

            {user?.passkeys.length !== undefined && <Divider />}
          </>
          <Button
            size='sm'
            leftIcon={<IconKey size='1rem' />}
            color={passkeyErrored ? 'red' : 'primary'}
            onClick={handleRegisterPasskey}
            loading={passkeyLoading}
          >
            {/* {passkeyLoading ? 'Loading...' : 'Create a passkey...'} */}
            {passkeyErrored
              ? 'Error while creating a passkey'
              : passkeyLoading
              ? 'Loading...'
              : 'Create a passkey'}
          </Button>

          {namerShown && (
            <>
              <Text size='sm'>Assign a name to this passkey so you can remember it later.</Text>

              <TextInput
                placeholder='Passkey name'
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />

              <Button size='sm' leftIcon={<IconKey size='1rem' />} color='blue' onClick={handleSavePasskey}>
                Save
              </Button>
            </>
          )}
        </Stack>
      </Modal>

      <Button size='sm' leftIcon={<IconKey size={24} />} onClick={() => setPasskeyOpen(true)}>
        Manage passkeys
      </Button>
    </>
  );
}
