import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Group, Modal, Stack, Switch } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconVideoOff } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function GenerateThumbnailsModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['serverActions', 'common']);
  const [rerun, setRerun] = useState(false);

  const handle = async () => {
    const { data, error } = await fetchApi<Response['/api/server/thumbnails']>(
      '/api/server/thumbnails',
      'POST',
      {
        rerun,
      },
    );

    if (!error && data) {
      showNotification({
        message: data.status,
        icon: <IconVideoOff size='1rem' />,
      });

      onClose();
    }
  };

  return (
    <Modal title={t('common:warning.title')} opened={opened} onClose={onClose}>
      <Stack mb='md'>
        <span>{t('modals.generateThumbnails.body')}</span>

        <Switch
          label={t('modals.generateThumbnails.rerun.label')}
          description={t('modals.generateThumbnails.rerun.description')}
          checked={rerun}
          onChange={() => setRerun((val) => !val)}
          color='red'
        />
      </Stack>

      <Group justify='flex-end'>
        <Button onClick={onClose}>{t('common:actions.cancel')}</Button>
        <Button color='red' onClick={handle}>
          {t('modals.generateThumbnails.confirm')}
        </Button>
      </Group>
    </Modal>
  );
}
