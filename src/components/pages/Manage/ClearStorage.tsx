import { Button, Checkbox, Group, Modal, Text, Title } from '@mantine/core';
import { closeAllModals, openConfirmModal } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconFiles, IconFilesOff } from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';

export default function ClearStorage({ open, setOpen, check, setCheck }) {
  const handleDelete = async (datasource: boolean, orphaned?: boolean) => {
    showNotification({
      id: 'clear-uploads',
      title: 'Clearing...',
      message: '',
      loading: true,
      autoClose: false,
    });

    const res = await useFetch('/api/admin/clear', 'POST', { datasource, orphaned });

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
      onClose={() => setOpen(false)}
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
              title: 'Do you want to clear storage too?',
              labels: { confirm: 'Yes', cancel: check ? 'Ok' : 'No' },
              children: check && (
                <Text size='sm' color='gray'>
                  Due to clearing orphaned files, storage clearing will be unavailable.
                </Text>
              ),
              confirmProps: { disabled: check },
              onConfirm: () => {
                closeAllModals();
                handleDelete(true);
              },
              onCancel: () => {
                closeAllModals();
                handleDelete(false, check);
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
