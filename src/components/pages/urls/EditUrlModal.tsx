import { Url } from '@/lib/db/models/url';
import { fetchApi } from '@/lib/fetchApi';
import useObjectState from '@/lib/client/hooks/useObjectState';
import { Button, Divider, Modal, NumberInput, PasswordInput, Stack, Switch, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconEye, IconKey, IconPencil, IconPencilOff, IconTrashFilled } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';

export default function EditUrlModal({ url, onClose }: { url: Url | null; onClose: () => void }) {
  const { t } = useTranslation('urls');
  const [urlData, setUrlData] = useObjectState<{
    maxViews: number | null;
    vanity: string | null;
    destination: string | null;
    enabled: boolean;
    password: string | null;
  }>({
    maxViews: url?.maxViews ?? null,
    vanity: url?.vanity ?? null,
    destination: url?.destination ?? null,
    enabled: url?.enabled ?? true,
    password: '',
  });

  useEffect(() => {
    if (url) {
      setUrlData({
        maxViews: url.maxViews,
        vanity: url.vanity,
        destination: url.destination,
        enabled: url.enabled,
        password: '',
      });
    }
  }, [url]);

  const handleRemovePassword = async () => {
    if (!url?.password) return;

    const { error } = await fetchApi(`/api/user/urls/${url.id}`, 'PATCH', {
      password: null,
    });

    if (error) {
      showNotification({
        title: t('notifications.removePasswordFailed.title'),
        message: error.error,
        color: 'red',
        icon: <IconPencilOff size='1rem' />,
      });
    } else {
      showNotification({
        title: t('notifications.passwordRemoved.title'),
        message: t('notifications.passwordRemoved.message'),
        color: 'green',
        icon: <IconPencil size='1rem' />,
      });

      onClose();
      mutate('/api/user/urls');
      mutate({ key: '/api/user/urls' });
    }
  };

  const handleSave = async () => {
    if (!url) return;

    const data: {
      maxViews?: number | null;
      password?: string;
      vanity?: string;
      destination?: string;
      enabled?: boolean;
    } = {};

    if (urlData.maxViews === null) data['maxViews'] = null;
    else data['maxViews'] = urlData.maxViews;

    if (urlData.password !== null && urlData.password.trim() !== '')
      data['password'] = urlData.password?.trim();

    if (urlData.vanity !== null && urlData.vanity !== url.vanity) data['vanity'] = urlData.vanity?.trim();
    if (urlData.destination !== null && urlData.destination !== url.destination)
      data['destination'] = urlData.destination?.trim();
    if (urlData.enabled !== url.enabled) data['enabled'] = urlData.enabled;

    const { error } = await fetchApi(`/api/user/urls/${url.id}`, 'PATCH', data);

    if (error) {
      showNotification({
        title: t('notifications.saveFailed.title'),
        message: error.error,
        color: 'red',
        icon: <IconPencilOff size='1rem' />,
      });
    } else {
      showNotification({
        title: t('notifications.saved.title'),
        message: t('notifications.saved.message'),
        color: 'green',
        icon: <IconPencil size='1rem' />,
      });

      onClose();
      mutate('/api/user/urls');
      mutate({ key: '/api/user/urls' });
    }
  };

  return (
    <Modal
      title={t('edit.title', { name: url?.vanity ?? url?.code ?? t('edit.unknown') })}
      opened={!!url}
      onClose={onClose}
    >
      <Stack gap='xs' my='sm'>
        <NumberInput
          label={t('edit.maxViews.label')}
          placeholder={t('edit.maxViews.placeholder')}
          description={t('edit.maxViews.description')}
          value={urlData.maxViews || ''}
          onChange={(value) => setUrlData('maxViews', value === '' ? null : Number(value))}
          min={0}
          leftSection={<IconEye size='1rem' />}
        />

        <TextInput
          label={t('edit.vanity.label')}
          placeholder={t('edit.vanity.placeholder')}
          description={t('edit.vanity.description')}
          value={urlData.vanity || ''}
          onChange={(event) =>
            setUrlData(
              'vanity',
              event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
            )
          }
        />

        <TextInput
          label={t('edit.destination.label')}
          placeholder='https://example.com'
          value={urlData.destination || ''}
          onChange={(event) =>
            setUrlData(
              'destination',
              event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
            )
          }
        />

        <Switch
          label={t('edit.enabled.label')}
          description={t('edit.enabled.description')}
          checked={urlData.enabled}
          onChange={(event) => setUrlData('enabled', event.currentTarget.checked)}
        />

        <Divider />

        {url?.password ? (
          <Button
            variant='light'
            color='red'
            leftSection={<IconTrashFilled size='1rem' />}
            onClick={handleRemovePassword}
          >
            {t('edit.password.remove')}
          </Button>
        ) : (
          <PasswordInput
            label={t('edit.password.label')}
            description={t('edit.password.description')}
            value={urlData.password ?? ''}
            autoComplete='off'
            onChange={(event) =>
              setUrlData(
                'password',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
              )
            }
            leftSection={<IconKey size='1rem' />}
          />
        )}

        <Divider />

        <Button onClick={handleSave} leftSection={<IconPencil size='1rem' />}>
          {t('edit.save')}
        </Button>
      </Stack>
    </Modal>
  );
}
