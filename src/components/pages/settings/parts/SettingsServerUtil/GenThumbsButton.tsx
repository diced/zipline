import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Group, Modal, Stack, Switch, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconVideo, IconVideoOff } from '@tabler/icons-react';
import { useState } from 'react';

export default function GenThumbsButton() {
  const [rerun, setRerun] = useState(false);
  const [open, setOpen] = useState(false);

  const handle = async () => {
    modals.closeAll();

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

      modals.closeAll();
    }
  };

  return (
    <>
      <Modal title={<Title>Are you sure?</Title>} opened={open} onClose={() => setOpen(false)}>
        <Stack mb='md'>
          <span>
            This will generate thumbnails for all files that do not have a thumbnail set. Additionally you can
            use the options below.
          </span>

          <Switch
            label='Re-run'
            description='Re-run the thumbnail generation for all files regardless of whether they have a thumbnail set.'
            checked={rerun}
            onChange={() => setRerun((val) => !val)}
            color='red'
          />
        </Stack>

        <Group justify='flex-end'>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button color='red' onClick={handle}>
            Generate
          </Button>
        </Group>
      </Modal>
      <Button size='sm' leftSection={<IconVideo size='1rem' />} onClick={() => setOpen(true)}>
        Generate Thumbnails
      </Button>
    </>
  );
}
