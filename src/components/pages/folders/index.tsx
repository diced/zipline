import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { FolderBreadcrumb } from '@/lib/folderHierarchy';
import { useViewStore } from '@/lib/store/view';
import { Anchor, Breadcrumbs, Button, Group, Modal, Stack, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconFolderPlus, IconHome, IconPlus } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import FolderGridView from './views/FolderGridView';
import FolderTableView from './views/FolderTableView';

export default function DashboardFolders() {
  const view = useViewStore((state) => state.folders);
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const folderPath = useMemo(() => {
    const pathname = location.pathname.replace('/dashboard/folders', '');
    if (!pathname || pathname === '/') return [];
    return pathname.split('/').filter(Boolean);
  }, [location.pathname]);

  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;

  const {
    data: currentFolder,
    error: currentFolderError,
    isLoading,
  } = useSWR<Folder>(currentFolderId ? `/api/user/folders/${currentFolderId}` : null);

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
        parentId: currentFolderId ?? undefined,
      },
    );

    if (error) {
      notifications.show({
        message: error.error,
        color: 'red',
      });
    } else {
      mutate((key: string) => key.startsWith('/api/user/folders'));
      setOpen(false);
      form.reset();
    }
  };

  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      if (folderId === null) {
        navigate('/dashboard/folders');
      } else {
        const newPath = [...folderPath, folderId];
        navigate(`/dashboard/folders/${newPath.join('/')}`);
      }
    },
    [navigate, folderPath],
  );

  const buildBreadcrumbs = () => {
    const items: FolderBreadcrumb[] = [{ id: null, name: 'Root', path: '/dashboard/folders' }];

    if (currentFolder) {
      const path: Partial<Folder>[] = [];
      let folder: Partial<Folder> | undefined | null = currentFolder;

      while (folder) {
        path.unshift(folder);
        folder = folder.parent;
      }

      const folderIds: string[] = [];
      for (const f of path) {
        folderIds.push(f.id!);
        items.push({
          id: f.id!,
          name: f.name!,
          path: `/dashboard/folders/${folderIds.join('/')}`,
        });
      }
    }

    return items;
  };

  const breadcrumbs = buildBreadcrumbs();

  useEffect(() => {
    if (!currentFolderId) return;
    if (isLoading) return;

    if (currentFolderError || !currentFolder) {
      navigate('/dashboard/folders', { replace: true });
    }
  }, [currentFolderId, currentFolder, currentFolderError, isLoading]);

  return (
    <>
      <Modal
        centered
        opened={open}
        onClose={() => setOpen(false)}
        title={currentFolderId ? 'Create a subfolder' : 'Create a folder'}
      >
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
          variant='outline'
          size='compact-sm'
          leftSection={<IconPlus size='1rem' />}
          onClick={() => setOpen(true)}
        >
          Create{currentFolderId ? ' Subfolder' : ' Folder'}
        </Button>

        <GridTableSwitcher type='folders' />
      </Group>

      {breadcrumbs.length > 1 && (
        <Breadcrumbs my='sm'>
          {breadcrumbs.map((item, index) => (
            <Anchor
              key={item.id ?? 'root'}
              onClick={() => navigate(item.path!)}
              style={{ cursor: 'pointer' }}
              fw={index === breadcrumbs.length - 1 ? 600 : 400}
            >
              {index === 0 ? <IconHome size='1rem' /> : item.name}
            </Anchor>
          ))}
        </Breadcrumbs>
      )}

      {view === 'grid' ? (
        <FolderGridView currentFolderId={currentFolderId} onNavigate={navigateToFolder} />
      ) : (
        <FolderTableView currentFolderId={currentFolderId} onNavigate={navigateToFolder} />
      )}
    </>
  );
}
