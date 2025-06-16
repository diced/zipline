import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/store/user';
import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  Modal,
  Paper,
  PasswordInput,
  ScrollArea,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAsteriskSimple,
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconEye,
  IconKey,
  IconLock,
  IconUser,
  IconUserCancel,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';

export default function SettingsUser() {
  const [user, setUser] = useUserStore(useShallow((state) => [state.user, state.setUser]));
  const router = useRouter();

  const [tokenShown, setTokenShown] = useState(false);
  const [token, setToken] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalType, setModalType] = useState<'token' | 'update'>('token');

  // Password confirmation form for modal
  const passwordForm = useForm({
    initialValues: {
      currentPassword: '',
    },
    validate: {
      currentPassword: (value) => (value.length < 1 ? 'Current password is required' : null),
    },
  });

  // Main form for user updates
  const form = useForm({
    initialValues: {
      username: user?.username ?? '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      username: (value) => (value.length < 1 ? 'Username is required' : null),
      confirmPassword: (value, values) => {
        if (values.password && value !== values.password) {
          return 'Passwords do not match';
        }
        return null;
      },
    },
  });

  // Clear confirm password when password is cleared
  useEffect(() => {
    if (!form.values.password && form.values.confirmPassword) {
      form.setFieldValue('confirmPassword', '');
    }
  }, [form.values.password]);

  // Verify password and show token
  const handleShowToken = async (currentPassword: string) => {
    const { data, error } = await fetchApi<{ valid: boolean; token?: string }>(
      '/api/user/verify-password',
      'POST',
      {
        password: currentPassword,
      },
    );

    if (error || !data?.valid) {
      passwordForm.setFieldError('currentPassword', 'Invalid password');
      return;
    }

    if (data.token) {
      setToken(data.token);
      setTokenShown(true);
      setShowPasswordModal(false);
      passwordForm.reset();
      notifications.show({
        message: 'Token revealed',
        color: 'green',
        icon: <IconEye size='1rem' />,
      });
    }
  };

  // Verify password for updates
  const handlePasswordConfirmation = async (currentPassword: string) => {
    const { data, error } = await fetchApi<{ valid: boolean }>('/api/user/verify-password', 'POST', {
      password: currentPassword,
    });

    if (error || !data?.valid) {
      passwordForm.setFieldError('currentPassword', 'Invalid password');
      return;
    }

    // Password is valid, proceed with the actual update
    setShowPasswordModal(false);
    passwordForm.reset();
    await performUserUpdate();
  };

  // Perform the actual user update after password verification
  const performUserUpdate = async () => {
    const values = form.values;
    const send: {
      username?: string;
      password?: string;
      currentPassword: string;
    } = {
      currentPassword: passwordForm.values.currentPassword,
    };

    if (values.username !== user?.username) send['username'] = values.username.trim();
    if (values.password) send['password'] = values.password.trim();

    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', send);

    if (!data && error) {
      if (error.error === 'Username already exists') {
        form.setFieldError('username', error.error);
      } else if (error.error === 'Invalid password') {
        form.setFieldError('confirmPassword', error.error);
      } else {
        notifications.show({
          title: 'Error while updating user',
          message: error.error,
          color: 'red',
          icon: <IconUserCancel size='1rem' />,
        });
      }
      return;
    }

    if (!data?.user) return;

    notifications.show({
      message: 'User updated successfully. You will be logged out in 3 seconds...',
      color: 'green',
      icon: <IconCheck size='1rem' />,
      autoClose: 3000,
    });

    // Clear form and logout user after update
    form.reset();
    setUser(null);

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/auth/logout');
    }, 3000);
  };

  const onSubmit = async (values: typeof form.values) => {
    // Check if any changes were made
    const hasChanges = values.username !== user?.username || values.password;

    if (!hasChanges) {
      notifications.show({
        message: 'No changes to save',
        color: 'blue',
      });
      return;
    }

    // Validate password confirmation if password is being changed
    if (values.password && values.password !== values.confirmPassword) {
      form.setFieldError('confirmPassword', 'Passwords do not match');
      return;
    }

    // Show password confirmation modal for updates
    setModalType('update');
    setShowPasswordModal(true);
  };

  const handleTokenClick = () => {
    if (tokenShown) return; // Token already shown

    setModalType('token');
    setShowPasswordModal(true);
  };

  return (
    <>
      <Paper withBorder p='sm'>
        <Title order={2}>User Info</Title>
        <Text c='dimmed' size='sm' mb='sm'>
          {user?.id}
        </Text>

        <form onSubmit={form.onSubmit(onSubmit)}>
          <TextInput
            rightSection={
              <CopyButton value={token} timeout={1000}>
                {({ copied, copy }) => (
                  <Tooltip label={tokenShown ? 'Click to copy token' : 'Enter password to view'}>
                    <ActionIcon onClick={tokenShown ? copy : handleTokenClick} variant='subtle' color='gray'>
                      {copied ? (
                        <IconCheck color='green' size='1rem' />
                      ) : tokenShown ? (
                        <IconCopy size='1rem' />
                      ) : (
                        <IconEye size='1rem' />
                      )}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
            // @ts-ignore this works trust
            component='span'
            label='Token'
            onClick={handleTokenClick}
            leftSection={<IconKey size='1rem' />}
            style={{ cursor: 'pointer' }}
          >
            <ScrollArea scrollbarSize={5}>
              {tokenShown ? token : 'Click here and enter password to show'}
            </ScrollArea>
          </TextInput>

          <TextInput
            label='Username'
            {...form.getInputProps('username')}
            leftSection={<IconUser size='1rem' />}
          />

          <PasswordInput
            label='New Password'
            description='Leave blank to keep the same password'
            autoComplete='new-password'
            {...form.getInputProps('password')}
            leftSection={<IconAsteriskSimple size='1rem' />}
            style={{ marginTop: '1rem' }}
          />

          <PasswordInput
            label='Double check'
            autoComplete='new-password'
            {...form.getInputProps('confirmPassword')}
            leftSection={<IconLock size='1rem' />}
            disabled={!form.values.password}
          />

          <Button type='submit' mt='md' loading={!user} leftSection={<IconDeviceFloppy size='1rem' />}>
            Save Changes
          </Button>
        </form>
      </Paper>

      {/* Password Confirmation Modal */}
      <Modal
        opened={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          passwordForm.reset();
        }}
        title={
          modalType === 'token' ? 'Enter Password to View Token' : 'Confirm Current Password to Save Changes'
        }
        centered
      >
        <form
          onSubmit={passwordForm.onSubmit((values) => {
            if (modalType === 'token') {
              handleShowToken(values.currentPassword);
            } else {
              handlePasswordConfirmation(values.currentPassword);
            }
          })}
        >
          <PasswordInput
            label='Current Password'
            placeholder='Enter your current password to confirm changes'
            autoComplete='current-password'
            {...passwordForm.getInputProps('currentPassword')}
            leftSection={<IconLock size='1rem' />}
            data-autofocus
          />

          <Group justify='flex-end' mt='md'>
            <Button
              variant='outline'
              onClick={() => {
                setShowPasswordModal(false);
                passwordForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type='submit' leftSection={<IconCheck size='1rem' />}>
              {modalType === 'token' ? 'Show Token' : 'Confirm & Save Changes'}
            </Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
