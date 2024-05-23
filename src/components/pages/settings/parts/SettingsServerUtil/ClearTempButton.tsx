import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';

export default function ClearTempButton() {
  const openModal = () =>
    modals.openConfirmModal({
      title: <Title>Are you sure?</Title>,
      children:
        'This will delete temporary files stored within the temporary directory (defined in the configuration). This should not cause harm unless there are files that are being processed still.',
      labels: { confirm: 'Yes, delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        modals.closeAll();

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
      },
    });

  return (
    <>
      <Button size='sm' leftSection={<IconTrashFilled size='1rem' />} onClick={openModal}>
        Clear Temp Files
      </Button>
    </>
  );
}
