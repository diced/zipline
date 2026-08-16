import { mutateFolder } from '@/components/pages/folders/actions';
import { Response } from '@/lib/api/response';
import { copyLink } from '@/lib/client/copyLink';
import type { File } from '@/lib/db/models/file';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { conditionalWarning } from '@/lib/client/warningModal';
import { getDomain } from '@/lib/client/webDomain';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconFolderMinus,
  IconFolderOff,
  IconFolderPlus,
  IconStar,
  IconStarFilled,
  IconTrashFilled,
  IconTrashXFilled,
} from '@tabler/icons-react';
import { mutate } from 'swr';

export function viewFile(file: File) {
  window.open(`/view/${file.name}`, '_blank');
}

export function downloadFile(file: File) {
  window.open(`/raw/${file.name}?download=true`, '_blank');
}

export function copyFile(file: File, clipboard: ReturnType<typeof useClipboard>, raw: boolean = false) {
  const url = raw
    ? getDomain(`/raw/${file.name}`)
    : file.url
      ? getDomain(file.url)
      : getDomain(`/view/${file.name}`);

  copyLink(url, clipboard);
}

export async function deleteFile(warnDeletion: boolean, file: File, setOpen: (open: boolean) => void) {
  conditionalWarning(warnDeletion, {
    confirmLabel: `Delete ${file.name}`,
    message: `Are you sure you want to delete ${file.name}? This action cannot be undone.`,
    onConfirm: () => handleDeleteFile(file, setOpen),
  });
}

export async function handleDeleteFile(file: File, setOpen: (open: boolean) => void) {
  const { error } = await fetchApi(`/api/user/files/${file.id}`, 'DELETE');

  if (error) {
    notifications.show({
      title: 'Error',
      message: error.error,
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
    },
  );

  if (error) {
    notifications.show({
      title: 'Error',
      message: error.error,
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

export async function createFolderAndAdd(file: File, folderName: string | null) {
  const { data, error } = await fetchApi<Extract<Response['/api/user/folders'], Folder>>(
    '/api/user/folders',
    'POST',
    {
      name: folderName,
      files: [file.id],
    },
  );
  if (error) {
    notifications.show({
      title: 'Error while creating folder',
      message: error.error,
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

  mutateFolder();
  mutateFiles();
}

export async function removeFromFolder(file: File) {
  const { data, error } = await fetchApi<{ folder: Folder }>(`/api/user/folders/${file.folderId}`, 'DELETE', {
    delete: 'file',
    id: file.id,
  });

  if (error) {
    notifications.show({
      title: 'Error while removing from folder',
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'File removed from folder',
      message: `${file.name} has been removed from ${data?.folder.name}`,
      color: 'green',
      icon: <IconFolderMinus size='1rem' />,
    });
  }

  mutateFolder();
  mutateFiles();
}

export async function addToFolder(file: File, folderId: string | null) {
  if (!folderId) return;

  const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
    `/api/user/folders/${folderId}`,
    'PUT',
    {
      id: file.id,
    },
  );

  if (error) {
    notifications.show({
      title: 'Error while adding to folder',
      message: error.error,
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

  mutateFolder();
  mutateFiles();
}

export async function addMultipleToFolder(files: File[], folderId: string | null) {
  if (!folderId) return;

  const { data, error } = await fetchApi<Response['/api/user/files/transaction']>(
    '/api/user/files/transaction',
    'PATCH',
    {
      folder: folderId,
      files: files.map((file) => file.id),
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
      title: 'Files added to folder',
      message: `${data!.count} file(s) have been added to ${data!.name}`,
      color: 'green',
      icon: <IconFolderPlus size='1rem' />,
    });
  }

  mutateFolder();
  mutateFiles();
}

export function mutateFiles() {
  mutate('/api/user/recent');
  mutate((key) => (key as Record<any, any>)?.key === '/api/user/files'); // paged files
}
