import { Button, Checkbox, Group, Modal, Text, Title } from '@mantine/core';
import { closeAllModals, openConfirmModal } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconFiles, IconFilesOff } from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';
import { useState } from 'react';

export default function ClearStorage({ open, setOpen }) {
  const [check, setCheck] = useState(false);
  const handleDelete = async (orphaned?: boolean) => {
    showNotification({
      id: 'clear-uploads',
      title: 'Clearing...',
      message: '',
      loading: true,
      autoClose: false,
    });

    const res = await useFetch('/api/admin/clear', 'POST', { orphaned });

    if (res.error) {
      updateNotification({
        id: 'clear-uploads',
        title: 'Error while clearing uploads',
        message: res.error,
        color: 'red',
        icon: <IconFilesOff size='1rem' />,
      });
    } else {
      updateNotification({
        id: 'clear-uploads',
        title: 'Successfully cleared uploads',
        message: '',
        color: 'green',
        icon: <IconFiles size='1rem' />,
      });
    }
  };

  return (
    <Modal
      opened={open}
      onClose={() => {
        setOpen(false);
        setCheck(() => false);
      }}
      title={<Title size='sm'>Are you sure you want to clear all uploads in the database?</Title>}
    >
      <Checkbox
        id='orphanedFiles'
        label='Clear only orphaned files?'
        description='Orphaned files are not owned by anyone. They can&#39;t be seen the dashboard by anyone.'
        checked={check}
        onChange={(e) => setCheck(e.currentTarget.checked)}
      />
      <Group position='right' mt='md'>
        <Button
          onClick={() => {
            setOpen(() => false);
          }}
        >
          No
        </Button>
        <Button
          onClick={() => {
            setOpen(false);
            openConfirmModal({
              title: 'Are you sure?',
              confirmProps: { color: 'red' },
              children: <Text size='sm'>This action is destructive and irreversible.</Text>,
              labels: { confirm: 'Yes', cancel: 'No' },
              onConfirm: () => {
                closeAllModals();
                handleDelete(check);
              },
              onClose: () => setCheck(false),
            });
          }}
        >
          Yes
        </Button>
      </Group>
    </Modal>
  );
}
