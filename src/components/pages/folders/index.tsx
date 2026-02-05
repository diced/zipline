import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { useViewStore } from '@/lib/store/view';
import { Button, Group, Modal, Stack, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconFolderPlus } from '@tabler/icons-react';
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
      name: (value) => (value.length < 1 ? 'Name is required' : null),
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
        message: error.error,
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
      <Modal centered opened={open} onClose={() => setOpen(false)} title='Create a folder'>
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

        <Button
          size='compact-sm'
          variant='outline'
          leftSection={<IconFolderPlus size='1rem' />}
          onClick={() => setOpen(true)}
        >
          Create
        </Button>

        <GridTableSwitcher type='folders' />
      </Group>

      {view === 'grid' ? <FolderGridView /> : <FolderTableView />}
    </>
  );
}
