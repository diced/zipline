import { Response } from '@/lib/api/response';
import type { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import { Anchor } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications as notifs } from '@mantine/notifications';
import { IconCopy, IconStar, IconStarFilled, IconTrashFilled, IconTrashXFilled } from '@tabler/icons-react';
import Link from 'next/link';
import { mutate } from 'swr';

export function viewFile(file: File) {
  window.open(`/view/${file.name}`, '_blank');
}

export function downloadFile(file: File) {
  window.open(`/raw/${file.name}?download=true`, '_blank');
}

export function copyFile(
  file: File,
  clipboard: ReturnType<typeof useClipboard>,
  notifications: typeof notifs
) {
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

export async function deleteFile(file: File, notifications: typeof notifs, setOpen: (open: boolean) => void) {
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

export async function favoriteFile(file: File, notifications: typeof notifs) {
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

export function mutateFiles() {
  mutate('/api/user/recent');
  mutate((key) => (key as Record<any, any>)?.key === '/api/user/files'); // paged files
}
