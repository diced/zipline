import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Group, Modal, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

export default function ClearZeroByteFilesModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['serverActions', 'common']);
  const { data } = useSWR<Response['/api/server/clear_zeros']>('/api/server/clear_zeros');

  const handle = async () => {
    onClose();

    const { data, error } = await fetchApi<Response['/api/server/clear_zeros']>(
      '/api/server/clear_zeros',
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
      <Text>{t('modals.clearZeroByteFiles.body', { count: data?.files?.length ?? 0 })}</Text>

      <Group justify='flex-end' mt='md'>
        <Button onClick={onClose}>{t('common:actions.cancel')}</Button>
        <Button color='red' onClick={handle}>
          {t('modals.confirmDelete')}
        </Button>
      </Group>
    </Modal>
  );
}
