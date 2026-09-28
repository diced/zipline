import { Response } from '@/lib/api/response';
import { copyLink } from '@/lib/client/copyLink';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import i18n from '@/lib/i18n';
import { getDomain } from '@/lib/client/webDomain';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconFolderOff } from '@tabler/icons-react';
import { mutate } from 'swr';

export function copyFolderUrl(folder: Folder, clipboard: ReturnType<typeof useClipboard>) {
  const url = getDomain(`/folder/${folder.id}`);
  copyLink(url, clipboard, `/folder/${folder.id}`);
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
      title: i18n.t('folders:notifications.visibilityFailed'),
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('folders:notifications.visibilityEdited'),
      message: isPublic
        ? i18n.t('folders:notifications.nowPublic', { name: data?.name })
        : i18n.t('folders:notifications.nowPrivate', { name: data?.name }),
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutateFolder();
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
      title: i18n.t('folders:notifications.uploadsFailed'),
      message: error.error,
      color: 'red',
      icon: <IconFolderOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('folders:notifications.uploadsEdited'),
      message: allowUploads
        ? i18n.t('folders:notifications.uploadsAllowed', { name: data?.name })
        : i18n.t('folders:notifications.uploadsDisallowed', { name: data?.name }),
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutateFolder();
}

export async function mutateFolder(folderId?: string) {
  if (folderId) return mutate(`/api/user/folders/${folderId}`);

  return mutate((key) => typeof key === 'string' && key.startsWith('/api/user/folders'));
}
