import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconFolder, IconFolderPlus, IconTrash, IconFiles, IconEye, IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';

interface Folder {
  id: string;
  name: string;
  createdAt: string;
  public: boolean;
  allowUploads: boolean;
  _count: {
    files: number;
  };
}

export default function FolderManagement() {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const { data: folders, isLoading } = useSWR<Folder[]>('/api/user/folders');

  const form = useForm({
    initialValues: {
      name: '',
      public: false,
      allowUploads: false,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Folder name is required' : null),
    },
  });

  const handleCreateFolder = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/folders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        showNotification({
          title: 'Success',
          message: 'Folder created successfully',
          color: 'green',
        });
        form.reset();
        close();
        mutate('/api/user/folders');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create folder');
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create folder',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the folder "${name}"? All files will be moved to root.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/folders/${id}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        showNotification({
          title: 'Success',
          message: result.message,
          color: 'green',
        });
        mutate('/api/user/folders');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete folder');
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete folder',
        color: 'red',
      });
    }
  };

  return (
    <Paper withBorder p='md'>
      <Group justify='space-between' mb='md'>
        <Title order={2}>Folder Management</Title>
        <Button leftSection={<IconFolderPlus size='1rem' />} onClick={open}>
          New Folder
        </Button>
      </Group>

      {isLoading ? (
        <Text>Loading folders...</Text>
      ) : !folders || folders.length === 0 ? (
        <Text c='dimmed' ta='center' py='xl'>
          No folders yet. Create your first folder to organize your files.
        </Text>
      ) : (
        <Stack gap='sm'>
          {folders.map((folder) => (
            <Card key={folder.id} withBorder p='sm'>
              <Group justify='space-between' align='center'>
                <Group gap='sm'>
                  <IconFolder size='1.2rem' color='var(--mantine-color-blue-6)' />
                  <div>
                    <Text fw={500}>{folder.name}</Text>
                    <Group gap='xs'>
                      <Group gap={4}>
                        <IconFiles size='0.8rem' />
                        <Text size='sm' c='dimmed'>
                          {folder._count.files} files
                        </Text>
                      </Group>
                      {folder.public && (
                        <Group gap={4}>
                          <IconEye size='0.8rem' />
                          <Text size='sm' c='dimmed'>
                            Public
                          </Text>
                        </Group>
                      )}
                      {folder.allowUploads && (
                        <Group gap={4}>
                          <IconUpload size='0.8rem' />
                          <Text size='sm' c='dimmed'>
                            Uploads
                          </Text>
                        </Group>
                      )}
                    </Group>
                  </div>
                </Group>
                <Tooltip label='Delete folder'>
                  <ActionIcon
                    color='red'
                    variant='subtle'
                    onClick={() => handleDeleteFolder(folder.id, folder.name)}
                  >
                    <IconTrash size='1rem' />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title='Create New Folder' size='md'>
        <form onSubmit={form.onSubmit(handleCreateFolder)}>
          <Stack gap='md'>
            <TextInput
              label='Folder Name'
              placeholder='Enter folder name'
              required
              {...form.getInputProps('name')}
            />

            <Switch
              label='Public Folder'
              description='Allow others to view this folder'
              {...form.getInputProps('public', { type: 'checkbox' })}
            />

            <Switch
              label='Allow Uploads'
              description='Allow uploads to this folder'
              {...form.getInputProps('allowUploads', { type: 'checkbox' })}
            />

            <Group justify='flex-end' gap='sm'>
              <Button variant='subtle' onClick={close} disabled={loading}>
                Cancel
              </Button>
              <Button type='submit' loading={loading} leftSection={<IconFolderPlus size='1rem' />}>
                Create Folder
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Paper>
  );
}
