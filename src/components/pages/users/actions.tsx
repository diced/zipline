import { Response } from '@/lib/api/response';
import { LimitedUser } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import i18n from '@/lib/i18n';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconUserCancel, IconUserMinus } from '@tabler/icons-react';
import { mutate } from 'swr';

export async function deleteUser(user: LimitedUser) {
  modals.openConfirmModal({
    centered: true,
    title: i18n.t('users:delete.title', { username: user.username }),
    children: i18n.t('users:delete.message', { username: user.username }),
    labels: {
      cancel: i18n.t('actions.cancel'),
      confirm: i18n.t('actions.delete'),
    },
    confirmProps: { color: 'red' },
    onConfirm: () =>
      modals.openConfirmModal({
        centered: true,
        title: i18n.t('users:delete.data.title', { username: user.username }),
        children: i18n.t('users:delete.data.message', { username: user.username }),
        labels: {
          cancel: i18n.t('users:delete.data.cancel'),
          confirm: i18n.t('users:delete.data.confirm'),
        },
        confirmProps: { color: 'red' },
        onConfirm: () => handleDeleteUser(user, true),
        onCancel: () => handleDeleteUser(user, false),
      }),
    onCancel: modals.closeAll,
  });
}

async function handleDeleteUser(user: LimitedUser, deleteFiles: boolean = false) {
  const { data, error } = await fetchApi<Response['/api/users/[id]']>(`/api/users/${user.id}`, 'DELETE', {
    delete: deleteFiles,
  });

  if (error) {
    notifications.show({
      title: i18n.t('users:notifications.deleteFailed'),
      message: error.error,
      color: 'red',
      icon: <IconUserCancel size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('users:notifications.deleted.title'),
      message: i18n.t('users:notifications.deleted.message', { username: data?.username }),
      color: 'blue',
      icon: <IconUserMinus size='1rem' />,
    });
  }

  mutate('/api/users?noincl=true');
  modals.closeAll();
}
