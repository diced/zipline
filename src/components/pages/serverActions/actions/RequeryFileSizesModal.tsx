import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Group, Modal, Stack, Switch } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconFileSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function RequeryFileSizesModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation(['serverActions', 'common']);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  const handle = async () => {
    onClose();
    setForceUpdate(false);
    setForceDelete(false);

    const { data, error } = await fetchApi<Response['/api/server/requery_size']>(
      '/api/server/requery_size',
      'POST',
      {
        forceUpdate,
        forceDelete,
      },
    );

    if (!error && data) {
      showNotification({
        message: data.status,
        icon: <IconFileSearch size='1rem' />,
      });
    }
  };

  return (
    <Modal title={t('common:warning.title')} opened={opened} onClose={onClose}>
      <Stack mb='md'>
        <span>{t('modals.requeryFileSizes.body')}</span>

        <Switch
          label={t('modals.requeryFileSizes.forceUpdate.label')}
          description={t('modals.requeryFileSizes.forceUpdate.description')}
          checked={forceUpdate}
          onChange={() => setForceUpdate((val) => !val)}
          color='red'
        />

        <Switch
          label={t('modals.requeryFileSizes.forceDelete.label')}
          description={t('modals.requeryFileSizes.forceDelete.description')}
          checked={forceDelete}
          onChange={() => setForceDelete((val) => !val)}
          color='red'
        />
      </Stack>

      <Group justify='flex-end'>
        <Button onClick={onClose}>{t('common:actions.cancel')}</Button>
        <Button color='red' onClick={handle}>
          {t('modals.requeryFileSizes.confirm')}
        </Button>
      </Group>
    </Modal>
  );
}
