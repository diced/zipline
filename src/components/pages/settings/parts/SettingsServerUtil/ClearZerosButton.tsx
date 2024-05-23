import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';
import useSWR from 'swr';

export default function ClearZerosButton() {
  const { data } = useSWR<Response['/api/server/clear_zeros']>('/api/server/clear_zeros');

  const openModal = () =>
    modals.openConfirmModal({
      title: <Title>Are you sure?</Title>,
      children: `This will delete ${data?.files?.length ?? 0} files from the database and datasource.`,
      labels: { confirm: 'Yes, delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        modals.closeAll();

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
      },
    });

  return (
    <>
      <Button size='sm' leftSection={<IconTrashFilled size='1rem' />} onClick={openModal}>
        Clear Zero Byte Files
      </Button>
    </>
  );
}
