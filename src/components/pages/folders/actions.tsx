import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Anchor } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconFolderOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { mutate } from 'swr';

export function copyFolderUrl(folder: Folder, clipboard: ReturnType<typeof useClipboard>) {
  clipboard.copy(`${window.location.protocol}//${window.location.host}/folder/${folder.id}`);

  notifications.show({
    title: 'Copied link',
    message: (
      <Anchor component={Link} to={`/folder/${folder.id}`}>
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

  mutate('/api/user/folders');
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

  mutate('/api/user/folders');
}
