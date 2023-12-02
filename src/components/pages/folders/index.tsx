import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { useViewStore } from '@/lib/store/view';
import { ActionIcon, Button, Group, Modal, Stack, Switch, TextInput, Title, Tooltip } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconFolderPlus, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { mutate } from 'swr';
import FolderGridView from './views/FolderGridView';
import FolderTableView from './views/FolderTableView';

export default function DashboardFolders() {
  const view = useViewStore((state) => state.folders);

  const [open, setOpen] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      isPublic: false,
    },
    validate: {
      name: hasLength({ min: 1 }, 'Name is required'),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const { error } = await fetchApi<Extract<Response['/api/user/folders'], Folder>>(
      '/api/user/folders',
      'POST',
      {
        name: values.name,
        isPublic: values.isPublic,
      },
    );

    if (error) {
      notifications.show({
        message: error.message,
        color: 'red',
      });
    } else {
      mutate('/api/user/folders');
      setOpen(false);
      form.reset();
    }
  };

  return (
    <>
      <Modal centered opened={open} onClose={() => setOpen(false)} title={<Title>Create a folder</Title>}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap='sm'>
            <TextInput label='Name' placeholder='Enter a name...' {...form.getInputProps('name')} />
            <Switch
              label='Public'
              description='Public folders are visible to everyone'
              {...form.getInputProps('isPublic', { type: 'checkbox' })}
            />

            <Button type='submit' variant='outline' radius='sm' leftSection={<IconFolderPlus size='1rem' />}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>Folders</Title>

        <Tooltip label='Create a new folder'>
          <ActionIcon variant='outline' onClick={() => setOpen(true)}>
            <IconPlus size='1rem' />
          </ActionIcon>
        </Tooltip>

        <GridTableSwitcher type='folders' />
      </Group>

      {view === 'grid' ? <FolderGridView /> : <FolderTableView />}
    </>
  );
}
