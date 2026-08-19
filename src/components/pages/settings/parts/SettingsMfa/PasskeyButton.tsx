import RelativeDate from '@/components/RelativeDate';
import { fetchApi } from '@/lib/fetchApi';
import useObjectState from '@/lib/client/hooks/useObjectState';
import { useUserStore } from '@/lib/client/store/user';
import type { UserPasskey } from '@/lib/db/models/user';
import { ActionIcon, Button, Group, Modal, Paper, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
  startRegistration,
} from '@simplewebauthn/browser';
import { IconKey, IconKeyOff, IconTrashFilled } from '@tabler/icons-react';
import { mutate } from 'swr';

export default function PasskeyButton() {
  const user = useUserStore((state) => state.user);
  const [pkData, setPkData] = useObjectState<{
    open: boolean;
    error: string | null;
    loading: boolean;

    nameShown: boolean;
    savedKey: RegistrationResponseJSON | null;
    name: string;
  }>({
    open: false,
    error: null,
    loading: false,

    nameShown: false,
    savedKey: null,
    name: '',
  });

  const handleRegisterPasskey = async () => {
    try {
      const { data } = await fetchApi<PublicKeyCredentialCreationOptionsJSON>(
        '/api/user/mfa/passkey/options',
        'GET',
      );

      setPkData('loading', true);
      const res = await startRegistration({ optionsJSON: data! });
      setPkData({
        nameShown: true,
        savedKey: res,
      });
    } catch (e: any) {
      setPkData({
        error: e.message ?? 'An error occurred while creating a passkey',
        loading: false,
        savedKey: null,
      });

      setTimeout(() => {
        setPkData('error', null);
      }, 10000);
    }
  };

  const handleSavePasskey = async () => {
    if (!pkData.savedKey) return;

    const { error } = await fetchApi('/api/user/mfa/passkey', 'POST', {
      response: pkData.savedKey,
      name: pkData.name.trim(),
    });

    if (error) {
      setPkData({
        nameShown: false,
        savedKey: null,
        error: '',
        loading: false,
      });

      notifications.show({
        title: 'Error while saving passkey',
        message: error.error,
        color: 'red',
        icon: <IconKeyOff size='1rem' />,
      });
    } else {
      setPkData({
        nameShown: false,
        loading: false,
        savedKey: null,
        open: false,
      });

      notifications.show({
        title: 'Passkey saved!',
        message: 'Your passkey has been saved successfully.',
        color: 'green',
        icon: <IconKey size='1rem' />,
      });

      mutate('/api/user');
    }
  };

  const removePasskey = async (passkey: UserPasskey) => {
    modals.openConfirmModal({
      title: 'Are you sure?',
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
            message: error.error,
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

  return (
    <>
      <Modal title='Manage passkeys' opened={pkData.open} onClose={() => setPkData('open', false)}>
        <Stack gap='sm'>
          <>
            {user?.passkeys?.map((passkey, i) => (
              <Paper withBorder p='xs' key={i}>
                <Group justify='space-between'>
                  <Text fw='bolder'>{passkey.name}</Text>
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
                {!(passkey.reg as Record<string, any>)?.webauthn && (
                  <Text size='xs' mt='xs' c='red'>
                    Warning: This passkey was created with an older version of Zipline and <b>WILL NOT</b>{' '}
                    work with this version. Please delete and recreate this passkey to ensure compatibility.
                  </Text>
                )}
              </Paper>
            ))}
          </>
          <Button
            size='sm'
            leftSection={<IconKey size='1rem' />}
            color={pkData.error ? 'red' : undefined}
            onClick={handleRegisterPasskey}
            loading={pkData.loading}
            disabled={!!pkData.error}
          >
            {pkData.error
              ? 'Error while creating a passkey - try again later'
              : pkData.loading
                ? 'Loading...'
                : 'Create a passkey'}
          </Button>
          {pkData.error && (
            <Text size='xs' c='red'>
              {pkData.error}
            </Text>
          )}

          {pkData.nameShown && (
            <>
              <Text size='sm'>Assign a name to this passkey so you can remember it later.</Text>

              <TextInput
                placeholder='Passkey name'
                value={pkData.name}
                onChange={(e) => setPkData('name', e.currentTarget.value)}
              />

              <Button
                size='sm'
                leftSection={<IconKey size='1rem' />}
                color='blue'
                onClick={handleSavePasskey}
              >
                Save
              </Button>
            </>
          )}
        </Stack>
      </Modal>

      <Button size='sm' leftSection={<IconKey size='1rem' />} onClick={() => setPkData('open', true)}>
        Manage passkeys
      </Button>
    </>
  );
}
