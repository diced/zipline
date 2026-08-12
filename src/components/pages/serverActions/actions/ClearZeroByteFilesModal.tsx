import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Group, Modal, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';
import useSWR from 'swr';

export default function ClearZeroByteFilesModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
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
    <Modal title='Are you sure?' opened={opened} onClose={onClose}>
      <Text>This will delete {data?.files?.length ?? 0} files from the database and datasource.</Text>

      <Group justify='flex-end' mt='md'>
        <Button onClick={onClose}>Cancel</Button>
        <Button color='red' onClick={handle}>
          Yes, delete
        </Button>
      </Group>
    </Modal>
  );
}
