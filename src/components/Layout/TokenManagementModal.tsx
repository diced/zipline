import type { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/store/user';
import useLogin from '@/lib/hooks/useLogin';
import { Modal, PasswordInput, Group, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconLock, IconCheck, IconClipboardCopy, IconRefreshDot } from '@tabler/icons-react';

interface TokenManagementModalProps {
  showPasswordModal: boolean;
  setShowPasswordModal: (show: boolean) => void;
  pendingAction: 'copy' | 'refresh' | null;
  setPendingAction: (action: 'copy' | 'refresh' | null) => void;
}

export function TokenManagementModal({
  showPasswordModal,
  setShowPasswordModal,
  pendingAction,
  setPendingAction,
}: TokenManagementModalProps) {
  const setUser = useUserStore((s) => s.setUser);
  const { mutate } = useLogin();
  const clipboard = useClipboard();

  const passwordForm = useForm({
    initialValues: {
      currentPassword: '',
    },
    validate: {
      currentPassword: (value) => (value.length < 1 ? 'Current password is required' : null),
    },
  });

  const verifyPassword = async (password: string) => {
    const { data, error } = await fetchApi<{ valid: boolean }>('/api/user/verify-password', 'POST', {
      password: password,
    });

    if (error || !data?.valid) {
      passwordForm.setFieldError('currentPassword', 'Invalid password');
      return false;
    }

    return true;
  };

  const performCopyToken = async () => {
    const { data, error } = await fetchApi<Response['/api/user/token']>('/api/user/token');
    if (error) {
      showNotification({
        title: 'Error',
        message: error.error,
        color: 'red',
        icon: <IconClipboardCopy size='1rem' />,
      });
    } else {
      clipboard.copy(data?.token ?? '');
      showNotification({
        title: 'Copied',
        message: 'Your token has been copied to your clipboard.',
        color: 'green',
        icon: <IconClipboardCopy size='1rem' />,
      });
    }
  };

  const performRefreshToken = async () => {
    const { data, error } = await fetchApi<Response['/api/user/token']>('/api/user/token', 'PATCH');
    if (error) {
      showNotification({
        title: 'Error',
        message: error.error,
        color: 'red',
        icon: <IconRefreshDot size='1rem' />,
      });
    } else {
      setUser(data?.user);
      mutate(data as Response['/api/user']);

      showNotification({
        title: 'Refreshed',
        message: 'Your token has been refreshed.',
        color: 'green',
        icon: <IconRefreshDot size='1rem' />,
      });
    }
  };

  const handlePasswordConfirmation = async (values: { currentPassword: string }) => {
    const isValid = await verifyPassword(values.currentPassword);

    if (!isValid) {
      return;
    }

    setShowPasswordModal(false);
    passwordForm.reset();

    if (pendingAction === 'copy') {
      await performCopyToken();
    } else if (pendingAction === 'refresh') {
      await performRefreshToken();
    }

    setPendingAction(null);
  };

  const handleClose = () => {
    setShowPasswordModal(false);
    passwordForm.reset();
    setPendingAction(null);
  };

  return (
    <Modal
      opened={showPasswordModal}
      onClose={handleClose}
      title={`Enter Password to ${pendingAction === 'copy' ? 'Copy' : 'Refresh'} Token`}
      centered
    >
      <form onSubmit={passwordForm.onSubmit(handlePasswordConfirmation)}>
        <PasswordInput
          label='Current Password'
          placeholder='Enter your current password to confirm this action'
          autoComplete='current-password'
          {...passwordForm.getInputProps('currentPassword')}
          leftSection={<IconLock size='1rem' />}
          data-autofocus
        />

        <Group justify='flex-end' mt='md'>
          <Button variant='outline' onClick={handleClose}>
            Cancel
          </Button>
          <Button type='submit' leftSection={<IconCheck size='1rem' />}>
            {pendingAction === 'copy' ? 'Copy Token' : 'Refresh Token'}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
