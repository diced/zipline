import { mutateFiles } from '@/components/file/actions';
import { Response } from '@/lib/api/response';
import { getDomain } from '@/lib/client/webDomain';
import type { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import i18n from '@/lib/i18n';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconClipboardListFilled,
  IconFilesOff,
  IconStarsFilled,
  IconStarsOff,
  IconTrashFilled,
} from '@tabler/icons-react';

export async function bulkDelete(ids: string[], setSelectedFiles: (files: File[]) => void) {
  modals.openConfirmModal({
    centered: true,
    title: i18n.t('files:bulk.delete.title', { count: ids.length }),
    children: i18n.t('files:bulk.delete.message', { count: ids.length }),
    labels: {
      cancel: i18n.t('common:actions.cancel'),
      confirm: i18n.t('common:actions.delete'),
    },
    confirmProps: { color: 'red' },
    onConfirm: async () => {
      notifications.show({
        title: i18n.t('files:bulk.delete.loadingTitle'),
        message: i18n.t('files:bulk.delete.loadingMessage', { count: ids.length }),
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
          title: i18n.t('files:bulk.delete.errorTitle'),
          message: error.error,
          color: 'red',
          icon: <IconFilesOff size='1rem' />,
          id: 'bulk-delete',
          autoClose: true,
          loading: false,
        });
      } else if (data) {
        notifications.update({
          title: i18n.t('files:bulk.delete.successTitle'),
          message: i18n.t('files:bulk.delete.successMessage', { count: data.count }),
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

export async function bulkFavorite(ids: string[], favorite: boolean) {
  const keys = favorite
    ? ({
        title: 'files:bulk.favorite.title',
        message: 'files:bulk.favorite.message',
        confirm: 'files:bulk.favorite.confirm',
        loadingTitle: 'files:bulk.favorite.loadingTitle',
        loadingMessage: 'files:bulk.favorite.loadingMessage',
        successTitle: 'files:bulk.favorite.successTitle',
        successMessage: 'files:bulk.favorite.successMessage',
      } as const)
    : ({
        title: 'files:bulk.unfavorite.title',
        message: 'files:bulk.unfavorite.message',
        confirm: 'files:bulk.unfavorite.confirm',
        loadingTitle: 'files:bulk.unfavorite.loadingTitle',
        loadingMessage: 'files:bulk.unfavorite.loadingMessage',
        successTitle: 'files:bulk.unfavorite.successTitle',
        successMessage: 'files:bulk.unfavorite.successMessage',
      } as const);

  modals.openConfirmModal({
    centered: true,
    title: i18n.t(keys.title, { count: ids.length }),
    children: i18n.t(keys.message, { count: ids.length }),
    labels: {
      cancel: i18n.t('common:actions.cancel'),
      confirm: i18n.t(keys.confirm),
    },
    confirmProps: { color: 'yellow' },
    onConfirm: async () => {
      notifications.show({
        title: i18n.t(keys.loadingTitle),
        message: i18n.t(keys.loadingMessage, { count: ids.length }),
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

          favorite,
        },
      );

      if (error) {
        notifications.update({
          title: i18n.t('files:bulk.modifyErrorTitle'),
          message: error.error,
          color: 'red',
          icon: <IconStarsOff size='1rem' />,
          id: 'bulk-favorite',
          autoClose: true,
          loading: false,
        });
      } else if (data) {
        notifications.update({
          title: i18n.t(keys.successTitle),
          message: i18n.t(keys.successMessage, { count: data.count }),
          color: 'yellow',
          icon: <IconStarsFilled size='1rem' />,
          id: 'bulk-favorite',
          autoClose: true,
          loading: false,
        });
      }

      mutateFiles();
    },
    onCancel: modals.closeAll,
  });
}

export async function bulkCopyLinks(urls: string[]) {
  const links = urls.map((url) => getDomain(url)).join('\n');

  await navigator.clipboard.writeText(links);

  notifications.show({
    title: i18n.t('files:bulk.copyLinks.title'),
    message: i18n.t('files:bulk.copyLinks.message', { count: urls.length }),
    color: 'green',
    icon: <IconClipboardListFilled size='1rem' />,
    autoClose: true,
  });
}
