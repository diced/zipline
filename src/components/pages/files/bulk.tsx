import { mutateFiles } from '@/components/file/actions';
import { Response } from '@/lib/api/response';
import { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconFilesOff, IconStarsFilled, IconStarsOff, IconTags, IconTrashFilled } from '@tabler/icons-react';

export async function bulkDelete(ids: string[], setSelectedFiles: (files: File[]) => void) {
  modals.openConfirmModal({
    centered: true,
    title: `Delete ${ids.length} file${ids.length === 1 ? '' : 's'}?`,
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
          message: error.error,
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
    title: `Favorite ${ids.length} file${ids.length === 1 ? '' : 's'}?`,
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
          message: error.error,
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

export async function bulkAddTags(ids: string[], tagIds: string[]) {
  notifications.show({
    title: 'Adding tags',
    message: `Adding ${tagIds.length} tag${tagIds.length === 1 ? '' : 's'} to ${ids.length} file${ids.length === 1 ? '' : 's'}`,
    color: 'blue',
    loading: true,
    id: 'bulk-add-tags',
    autoClose: false,
  });

  const { data, error } = await fetchApi<Response['/api/user/files/transaction']>(
    '/api/user/files/transaction',
    'PATCH',
    {
      files: ids,
      tags: tagIds,
    },
  );

  if (error) {
    notifications.update({
      title: 'Error while adding tags',
      message: error.error,
      color: 'red',
      icon: <IconTags size='1rem' />,
      id: 'bulk-add-tags',
      autoClose: true,
      loading: false,
    });
  } else if (data) {
    notifications.update({
      title: 'Tags added',
      message: `Added tags to ${data.count} file${data.count === 1 ? '' : 's'}`,
      color: 'green',
      icon: <IconTags size='1rem' />,
      id: 'bulk-add-tags',
      autoClose: true,
      loading: false,
    });
  }

  mutateFiles();
}
