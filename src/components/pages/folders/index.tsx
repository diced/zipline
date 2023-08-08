import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/store/view';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconFolderPlus, IconLink, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import FolderGridView from './views/FolderGridView';
import FolderTableView from './views/FolderTableView';
import { hasLength, useForm } from '@mantine/form';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Response } from '@/lib/api/response';
import { mutate } from 'swr';
import { notifications } from '@mantine/notifications';

export default function DashboardFolders() {
  const clipboard = useClipboard();
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
      `/api/user/folders`,
      'POST',
      {
        name: values.name,
        isPublic: values.isPublic,
      }
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
          <Stack spacing='sm'>
            <TextInput label='Name' placeholder='Enter a name...' {...form.getInputProps('name')} />
            <Switch
              label='Public'
              description='Public folders are visible to everyone'
              {...form.getInputProps('isPublic', { type: 'checkbox' })}
            />

            <Button type='submit' variant='outline' radius='sm' leftIcon={<IconFolderPlus size='1rem' />}>
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
