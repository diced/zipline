import { Response } from '@/lib/api/response';
import type { File } from '@/lib/db/models/file';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Anchor } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications, notifications as notifs } from '@mantine/notifications';
import {
  IconCopy,
  IconFolderMinus,
  IconFolderOff,
  IconFolderPlus,
  IconStar,
  IconStarFilled,
  IconTrashFilled,
  IconTrashXFilled,
} from '@tabler/icons-react';
import Link from 'next/link';
import { mutate } from 'swr';

export function viewFile(file: File) {
  window.open(`/view/${file.name}`, '_blank');
}

export function downloadFile(file: File) {
  window.open(`/raw/${file.name}?download=true`, '_blank');
}

export function copyFile(file: File, clipboard: ReturnType<typeof useClipboard>) {
  const domain = `${window.location.protocol}//${window.location.host}`;

  const url = file.url ? `${domain}${file.url}` : `${domain}/view/${file.name}`;

  clipboard.copy(url);

  notifications.show({
    title: 'Copied link',
    message: (
      <Anchor component={Link} href={url}>
        {url}
      </Anchor>
    ),
    color: 'green',
    icon: <IconCopy size='1rem' />,
  });
}

export async function deleteFile(file: File, setOpen: (open: boolean) => void) {
  const { error } = await fetchApi(`/api/user/files/${file.id}`, 'DELETE');

  if (error) {
    notifications.show({
      title: 'Error',
      message: error.message,
      color: 'red',
      icon: <IconTrashXFilled size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'File deleted',
      message: `${file.name} has been deleted`,
      color: 'green',
      icon: <IconTrashFilled size='1rem' />,
    });

    setOpen(false);
  }

  mutateFiles();
}

export async function favoriteFile(file: File) {
  const { data, error } = await fetchApi<Response['/api/user/files/[id]']>(
    `/api/user/files/${file.id}`,
    'PATCH',
    {
      favorite: !file.favorite,
    }
  );

  if (error) {
    notifications.show({
      title: 'Error',
      message: error.message,
      color: 'red',
      icon: <IconStar size='1rem' />,
    });
  } else {
    notifications.show({
      title: `File ${data!.favorite ? 'favorited' : 'unfavorited'}`,
      message: `${file.name} has been ${data!.favorite ? 'favorited' : 'unfavorited'}`,
      color: 'yellow',
      icon: <IconStarFilled size='1rem' />,
    });
  }

  mutateFiles();
}

export function createFolderAndAdd(file: File, folderName: string | null) {
  fetchApi<Extract<Response['/api/user/folders'], Folder>>(`/api/user/folders`, 'POST', {
    name: folderName,
    files: [file.id],
  }).then(({ data, error }) => {
    if (error) {
      notifications.show({
        title: 'Error while creating folder',
        message: error.message,
        color: 'red',
        icon: <IconFolderOff size='1rem' />,
      });
    } else {
      notifications.show({
        title: 'Folder created',
        message: `${data!.name} has been created with ${file.name}`,
        color: 'green',
        icon: <IconFolderPlus size='1rem' />,
      });
    }
  });

  mutateFolders();
  mutateFiles();

  return undefined;
}

export async function removeFromFolder(file: File) {
  const { data, error } = await fetchApi<Response['/api/user/files/[id]']>(
    `/api/user/folders/${file.folderId}`,
    'DELETE',
    {
      delete: 'file',
      id: file.id,
    }
  );

  if (error) {
    notifications.show({
      title: 'Error while removing from folder',
      message: error.message,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'File removed from folder',
      message: `${file.name} has been removed from ${data!.name}`,
      color: 'green',
      icon: <IconFolderMinus size='1rem' />,
    });
  }

  mutateFolders();
  mutateFiles();
}

export async function addToFolder(file: File, folderId: string | null) {
  if (!folderId) return;

  const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
    `/api/user/folders/${folderId}`,
    'POST',
    {
      id: file.id,
    }
  );

  if (error) {
    notifications.show({
      title: 'Error while adding to folder',
      message: error.message,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'File added to folder',
      message: `${file.name} has been added to ${data!.name}`,
      color: 'green',
      icon: <IconFolderPlus size='1rem' />,
    });
  }

  mutateFolders();
  mutateFiles();
}

export function mutateFiles() {
  mutate('/api/user/recent');
  mutate((key) => (key as Record<any, any>)?.key === '/api/user/files'); // paged files
}

export function mutateFolders() {
  mutate('/api/user/folders');
  mutate('/api/user/folders?noincl=true');
}
