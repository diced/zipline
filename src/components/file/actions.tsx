import { mutateFolder } from '@/components/pages/folders/actions';
import { Response } from '@/lib/api/response';
import { copyLink } from '@/lib/client/copyLink';
import type { File } from '@/lib/db/models/file';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import i18n from '@/lib/i18n';
import { conditionalWarning } from '@/lib/client/warningModal';
import { getDomain } from '@/lib/client/webDomain';
import { formatRootUrl } from '@/lib/url';
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
  window.open(formatRootUrl('/view', file.name), '_blank');
}

export function downloadFile(file: File) {
  window.open(formatRootUrl('/raw', file.name, { download: 'true' }), '_blank');
}

export function copyFile(file: File, clipboard: ReturnType<typeof useClipboard>, raw: boolean = false) {
  const url = raw
    ? getDomain(formatRootUrl('/raw', file.name))
    : file.url
      ? getDomain(file.url)
      : getDomain(formatRootUrl('/view', file.name));

  copyLink(url, clipboard);
}

export async function deleteFile(warnDeletion: boolean, file: File, setOpen: (open: boolean) => void) {
  conditionalWarning(warnDeletion, {
    confirmLabel: i18n.t('file:delete.confirm', { name: file.name }),
    message: i18n.t('file:delete.message', { name: file.name }),
    onConfirm: () => handleDeleteFile(file, setOpen),
  });
}

export async function handleDeleteFile(file: File, setOpen: (open: boolean) => void) {
  const { error } = await fetchApi(`/api/user/files/${file.id}`, 'DELETE');

  if (error) {
    notifications.show({
      title: i18n.t('common:status.error'),
      message: error.error,
      color: 'red',
      icon: <IconTrashXFilled size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('file:notifications.deleted.title'),
      message: i18n.t('file:notifications.deleted.message', { name: file.name }),
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
      title: i18n.t('common:status.error'),
      message: error.error,
      color: 'red',
      icon: <IconStar size='1rem' />,
    });
  } else {
    notifications.show({
      title: data!.favorite
        ? i18n.t('file:notifications.favorited.title')
        : i18n.t('file:notifications.unfavorited.title'),
      message: data!.favorite
        ? i18n.t('file:notifications.favorited.message', { name: file.name })
        : i18n.t('file:notifications.unfavorited.message', { name: file.name }),
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
      title: i18n.t('file:notifications.createFolderError.title'),
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('file:notifications.folderCreated.title'),
      message: i18n.t('file:notifications.folderCreated.message', { folder: data!.name, name: file.name }),
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
      title: i18n.t('file:notifications.removeFromFolderError.title'),
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('file:notifications.removedFromFolder.title'),
      message: i18n.t('file:notifications.removedFromFolder.message', {
        name: file.name,
        folder: `${data?.folder.name}`,
      }),
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
      title: i18n.t('file:notifications.addToFolderError.title'),
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('file:notifications.addedToFolder.title'),
      message: i18n.t('file:notifications.addedToFolder.message', { name: file.name, folder: data!.name }),
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
      title: i18n.t('file:notifications.addMultipleToFolderError.title'),
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('file:notifications.addedMultipleToFolder.title'),
      message: i18n.t('file:notifications.addedMultipleToFolder.message', {
        count: data!.count,
        folder: data!.name,
      }),
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
