import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';
import ActionButton from '../ActionButton';

export default function ClearTempButton() {
  const openModal = () =>
    modals.openConfirmModal({
      title: 'Are you sure?',
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

  return <ActionButton onClick={openModal} Icon={IconTrashFilled} />;
}
