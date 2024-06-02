import { mutateFiles } from '@/components/file/actions';
import { Response } from '@/lib/api/response';
import { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import { Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconFilesOff, IconStarsFilled, IconStarsOff, IconTrashFilled } from '@tabler/icons-react';

export async function bulkDelete(ids: string[], setSelectedFiles: (files: File[]) => void) {
  modals.openConfirmModal({
    centered: true,
    title: (
      <Title>
        Delete {ids.length} file{ids.length === 1 ? '' : 's'}?
      </Title>
    ),
    children: `You are about to delete ${ids.length} file${
      ids.length === 1 ? '' : 's'
    }. This action cannot be undone.`,
    labels: {
      cancel: 'Cancel',
      confirm: 'Delete',
    },
    confirmProps: { color: 'red' },
    onConfirm: async () => {
      notifications.show({
        title: 'Deleting files',
        message: `Deleting ${ids.length} file${ids.length === 1 ? '' : 's'}`,
        color: 'blue',
        loading: true,
        id: 'bulk-delete',
        autoClose: false,
      });

      modals.closeAll();

      const { data, error } = await fetchApi<Response['/api/user/files/transaction']>(
        '/api/user/files/transaction',
        'DELETE',
        {
          files: ids,

          delete_datasourceFiles: true,
        },
      );

      if (error) {
        notifications.update({
          title: 'Error while deleting files',
          message: error.message,
          color: 'red',
          icon: <IconFilesOff size='1rem' />,
          id: 'bulk-delete',
          autoClose: true,
        });
      } else if (data) {
        notifications.update({
          title: 'Deleted files',
          message: `Deleted ${data.count} file${ids.length === 1 ? '' : 's'}`,
          color: 'green',
          icon: <IconTrashFilled size='1rem' />,
          id: 'bulk-delete',
          autoClose: true,
          loading: false,
        });
      }

      setSelectedFiles([]);
      mutateFiles();
    },
    onCancel: modals.closeAll,
  });
}

export async function bulkFavorite(ids: string[]) {
  modals.openConfirmModal({
    centered: true,
    title: (
      <Title>
        Favorite {ids.length} file{ids.length === 1 ? '' : 's'}?
      </Title>
    ),
    children: `You are about to favorite ${ids.length} file${ids.length === 1 ? '' : 's'}.`,
    labels: {
      cancel: 'Cancel',
      confirm: 'Favorite',
    },
    confirmProps: { color: 'yellow' },
    onConfirm: async () => {
      notifications.show({
        title: 'Favoriting files',
        message: `Favoriting ${ids.length} file${ids.length === 1 ? '' : 's'}`,
        color: 'yellow',
        loading: true,
        id: 'bulk-favorite',
        autoClose: false,
      });
      modals.closeAll();

      const { data, error } = await fetchApi<Response['/api/user/files/transaction']>(
        '/api/user/files/transaction',
        'PATCH',
        {
          files: ids,

          favorite: true,
        },
      );

      if (error) {
        notifications.update({
          title: 'Error while favoriting files',
          message: error.message,
          color: 'red',
          icon: <IconStarsOff size='1rem' />,
          id: 'bulk-favorite',
          autoClose: true,
        });
      } else if (data) {
        notifications.update({
          title: 'Favorited files',
          message: `Favorited ${data.count} file${ids.length === 1 ? '' : 's'}`,
          color: 'yellow',
          icon: <IconStarsFilled size='1rem' />,
          id: 'bulk-favorite',
          autoClose: true,
        });
      }

      mutateFiles();
    },
    onCancel: modals.closeAll,
  });
}
