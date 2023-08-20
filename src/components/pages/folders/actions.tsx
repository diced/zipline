import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Anchor, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconFolderOff } from '@tabler/icons-react';
import Link from 'next/link';
import { mutate } from 'swr';

export async function deleteFolder(folder: Folder) {
  modals.openConfirmModal({
    centered: true,
    title: <Title>Delete {folder.name}?</Title>,
    children: `Are you sure you want to delete ${folder.name}? This action cannot be undone.`,
    labels: {
      cancel: 'Cancel',
      confirm: 'Delete',
    },
    confirmProps: { color: 'red' },
    onConfirm: () => handleDeleteFolder(folder),
    onCancel: modals.closeAll,
  });
}

export function copyFolderUrl(folder: Folder, clipboard: ReturnType<typeof useClipboard>) {
  clipboard.copy(`${window.location.protocol}//${window.location.host}/folder/${folder.id}`);

  notifications.show({
    title: 'Copied link',
    message: (
      <Anchor component={Link} href={`/folder/${folder.id}`}>
        {`${window.location.protocol}//${window.location.host}/folder/${folder.id}`}
      </Anchor>
    ),
    color: 'green',
    icon: <IconCopy size='1rem' />,
  });
}

export async function editFolderVisibility(folder: Folder, isPublic: boolean) {
  const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
    `/api/user/folders/${folder.id}`,
    'PATCH',
    {
      isPublic,
    },
  );

  if (error) {
    notifications.show({
      title: 'Failed to edit folder visibility',
      message: error.message,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'Folder visibility edited',
      message: `${data?.name} is now ${isPublic ? 'public' : 'private'}`,
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutate('/api/user/folders');
}

async function handleDeleteFolder(folder: Folder) {
  const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
    `/api/user/folders/${folder.id}`,
    'DELETE',
    {
      delete: 'folder',
    },
  );

  if (error) {
    notifications.show({
      title: 'Failed to delete folder',
      message: error.message,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'Folder deleted',
      message: `${data?.name} has been deleted`,
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutate('/api/user/folders');
}
