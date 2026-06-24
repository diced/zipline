import { Response } from '@/lib/api/response';
import { LimitedUser } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconUserCancel, IconUserMinus } from '@tabler/icons-react';
import { mutate } from 'swr';

export async function deleteUser(user: LimitedUser) {
  modals.openConfirmModal({
    centered: true,
    title: `Delete ${user.username}?`,
    children: `Are you sure you want to delete ${user.username}? This action cannot be undone.`,
    labels: {
      cancel: 'Cancel',
      confirm: 'Delete',
    },
    confirmProps: { color: 'red' },
    onConfirm: () =>
      modals.openConfirmModal({
        centered: true,
        title: `Delete ${user.username}'s data?`,
        children: `Would you like to delete ${user.username}'s files and urls? This action cannot be undone.`,
        labels: {
          cancel: 'No, keep everything & only delete user',
          confirm: 'Yes, delete everything',
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
      title: 'Failed to delete user',
      message: error.error,
      color: 'red',
      icon: <IconUserCancel size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'User deleted',
      message: `User ${data?.username} has been deleted`,
      color: 'blue',
      icon: <IconUserMinus size='1rem' />,
    });
  }

  mutate('/api/users?noincl=true');
  modals.closeAll();
}
