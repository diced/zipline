import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Anchor } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconFolderOff, IconFolderPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { mutate } from 'swr';
import { mutateFolders } from '@/components/file/actions';

export async function deleteFolder(folder: Folder) {
  modals.openConfirmModal({
    centered: true,
    title: `Delete ${folder.name}?`,
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
  const folderUrl = `${window.location.protocol}//${window.location.host}/folder/${folder.id}`;
  clipboard.copy(folderUrl);

  notifications.show({
    title: 'Copied link',
    message: (
      <Anchor component={Link} href={`/folder/${folder.id}`}>
        {folderUrl}
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
      message: error.error,
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

  mutateFolders();
}

export async function editFolderUploads(folder: Folder, allowUploads: boolean) {
  const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
    `/api/user/folders/${folder.id}`,
    'PATCH',
    {
      allowUploads,
    },
  );

  if (error) {
    notifications.show({
      title: 'Failed to edit folder uploads policy',
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'Folder uploads policy edited',
      message: `${data?.name} will ${allowUploads ? 'now' : 'no longer'} allow anonymous uploads`,
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutateFolders();
}

export async function editFolderName(folder: Folder, name: string) {
  const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
    `/api/user/folders/${folder.id}`,
    'PATCH',
    {
      name,
    },
  );

  if (error) {
    notifications.show({
      title: 'Failed to rename folder',
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'Folder renamed',
      message: `${folder?.name} renamed to ${name}`,
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutateFolders();
}

export async function moveFolderToAnotherFolder(folder: Folder, newParentFolderId: string | null) {
  const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
    `/api/user/folders/${folder.id}`,
    'PATCH',
    {
      parentFolderId: newParentFolderId,
    },
  );

  if (error) {
    notifications.show({
      title: 'Error while adding files to folder',
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'Folder moved',
      message: `Folder ${data!.name} have been moved to ${data!.name}`,
      color: 'green',
      icon: <IconFolderPlus size='1rem' />,
    });
  }

  mutateFolders();
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
      message: error.error,
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
