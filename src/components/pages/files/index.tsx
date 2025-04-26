import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/store/view';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Tabs,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import FileTable from './views/FileTable';
import Files from './views/Files';
import TagsButton from './tags/TagsButton';
import PendingFilesButton from './PendingFilesButton';
import { IconFileUpload, IconFolderPlus } from '@tabler/icons-react';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useForm } from '@mantine/form';
import { fetchApi } from '@/lib/fetchApi';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { notifications } from '@mantine/notifications';
import useSWR, { mutate } from 'swr';
import UploadFile from '@/components/pages/upload/File';
import { FilesSystemState, useFilesSystemState } from '@/components/pages/files/state/FileSystemState';
import { mutateFolders } from '@/components/file/actions';
import UploadText from '@/components/pages/upload/Text';

export default function DashboardFiles({ codeMeta }: { codeMeta: any }) {
  const view = useViewStore((state) => state.files);
  const fileSystemState: FilesSystemState = useFilesSystemState();

  const { isLoading: isLoadingFolders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    '/api/user/folders',
    {
      onSuccess: (data) => {
        fileSystemState.setFolders(data);
      },
    },
  );

  const [open, setOpen] = useQueryState('cfopen', parseAsBoolean.withDefault(false));
  const [ufOpen, setufOpen] = useQueryState('ufopen', parseAsBoolean.withDefault(false));

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
        parentFolderId: fileSystemState?.currentFolder?.id,
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

      <Modal centered opened={ufOpen} onClose={() => setufOpen(false)} title='Upload a file'>
        <Tabs defaultValue='file' variant="outline">
          <Tabs.List>
            <Tabs.Tab value='file'>Upload File</Tabs.Tab>
            <Tabs.Tab value='text'>Upload Text</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='file'>
            <UploadFile
              folder={fileSystemState?.currentFolder}
              onUploaded={() => {
                setufOpen(false);
                mutateFolders();
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value='text'>
            <UploadText
              folder={fileSystemState?.currentFolder}
              onUploaded={() => {
                setufOpen(false);
                mutateFolders();
              }}
              codeMeta={codeMeta}
            />
          </Tabs.Panel>
        </Tabs>
      </Modal>

      <Group>
        <Title>Files</Title>

        <Tooltip label='Upload a file'>
          <ActionIcon variant='outline' onClick={() => setufOpen(true)}>
            <IconFileUpload size='1rem' />
          </ActionIcon>
        </Tooltip>

        <Tooltip label='Create a new folder'>
          <ActionIcon variant='outline' onClick={() => setOpen(true)}>
            <IconFolderPlus size='1rem' />
          </ActionIcon>
        </Tooltip>

        <TagsButton />
        <PendingFilesButton />

        <GridTableSwitcher type='files' />
      </Group>

      {view === 'grid' ? (
        <>
          <Files />
        </>
      ) : (
        <FileTable />
      )}
    </>
  );
}
