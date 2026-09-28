import RelativeDate from '@/components/RelativeDate';
import { fetchApi } from '@/lib/fetchApi';
import useObjectState from '@/lib/client/hooks/useObjectState';
import { useUserStore } from '@/lib/client/store/user';
import type { UserPasskey } from '@/lib/db/models/passkey';
import { ActionIcon, Button, Group, Modal, Paper, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
  startRegistration,
} from '@simplewebauthn/browser';
import { IconKey, IconKeyOff, IconTrashFilled } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { mutate } from 'swr';

export default function PasskeyButton() {
  const { t } = useTranslation(['settings', 'common']);
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
        error: e.message ?? t('mfa.passkeys.createErrorFallback'),
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
        title: t('mfa.passkeys.notifications.saveError.title'),
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
        title: t('mfa.passkeys.notifications.saved.title'),
        message: t('mfa.passkeys.notifications.saved.message'),
        color: 'green',
        icon: <IconKey size='1rem' />,
      });

      mutate('/api/user');
    }
  };

  const removePasskey = async (passkey: UserPasskey) => {
    modals.openConfirmModal({
      title: t('common:warning.title'),
      children: t('mfa.passkeys.modals.remove.message', { name: passkey.name }),
      labels: {
        confirm: t('mfa.passkeys.modals.remove.confirm', { name: passkey.name }),
        cancel: t('common:actions.cancel'),
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
            title: t('mfa.passkeys.notifications.removeError.title'),
            message: error.error,
            color: 'red',
            icon: <IconKeyOff size='1rem' />,
          });
        } else {
          notifications.show({
            title: t('mfa.passkeys.notifications.removed.title'),
            message: t('mfa.passkeys.notifications.removed.message'),
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
      <Modal title={t('mfa.passkeys.manage')} opened={pkData.open} onClose={() => setPkData('open', false)}>
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
                  {passkey.lastUsed ? (
                    <Trans
                      t={t}
                      i18nKey='mfa.passkeys.createdAndUsed'
                      components={{
                        created: <RelativeDate date={passkey.createdAt} />,
                        lastUsed: <RelativeDate date={passkey.lastUsed} />,
                      }}
                    />
                  ) : (
                    <Trans
                      t={t}
                      i18nKey='mfa.passkeys.created'
                      components={{ created: <RelativeDate date={passkey.createdAt} /> }}
                    />
                  )}
                </Text>
                {!(passkey.reg as Record<string, any>)?.webauthn && (
                  <Text size='xs' mt='xs' c='red'>
                    <Trans t={t} i18nKey='mfa.passkeys.legacyWarning' components={{ b: <b /> }} />
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
              ? t('mfa.passkeys.createError')
              : pkData.loading
                ? t('common:status.loading')
                : t('mfa.passkeys.create')}
          </Button>
          {pkData.error && (
            <Text size='xs' c='red'>
              {pkData.error}
            </Text>
          )}

          {pkData.nameShown && (
            <>
              <Text size='sm'>{t('mfa.passkeys.namePrompt')}</Text>

              <TextInput
                placeholder={t('mfa.passkeys.namePlaceholder')}
                value={pkData.name}
                onChange={(e) => setPkData('name', e.currentTarget.value)}
              />

              <Button
                size='sm'
                leftSection={<IconKey size='1rem' />}
                color='blue'
                onClick={handleSavePasskey}
              >
                {t('common:actions.save')}
              </Button>
            </>
          )}
        </Stack>
      </Modal>

      <Button size='sm' leftSection={<IconKey size='1rem' />} onClick={() => setPkData('open', true)}>
        {t('mfa.passkeys.manage')}
      </Button>
    </>
  );
}
