import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Group, Modal, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export default function ClearTemporaryFilesModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['serverActions', 'common']);
  const handle = async () => {
    onClose();

    const { data, error } = await fetchApi<Response['/api/server/clear_temp']>(
      '/api/server/clear_temp',
      'DELETE',
    );

    if (!error && data) {
      showNotification({
        message: data.status,
        icon: <IconTrashFilled size='1rem' />,
      });
    }
  };

  return (
    <Modal title={t('common:warning.title')} opened={opened} onClose={onClose}>
      <Text>{t('modals.clearTemporaryFiles.body')}</Text>

      <Group justify='flex-end' mt='md'>
        <Button onClick={onClose}>{t('common:actions.cancel')}</Button>
        <Button color='red' onClick={handle}>
          {t('modals.confirmDelete')}
        </Button>
      </Group>
    </Modal>
  );
}
