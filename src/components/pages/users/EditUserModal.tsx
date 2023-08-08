import { Response } from '@/lib/api/response';
import { User } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { readToDataURL } from '@/lib/base64';
import { canInteract } from '@/lib/role';
import { useUserStore } from '@/lib/store/user';
import {
  ActionIcon,
  Button,
  FileInput,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPhotoMinus, IconUserCancel, IconUserEdit } from '@tabler/icons-react';
import { mutate } from 'swr';

export default function EditUserModal({
  user,
  opened,
  onClose,
}: {
  user?: User | null;
  opened: boolean;
  onClose: () => void;
}) {
  const currentUser = useUserStore((state) => state.user);

  const form = useForm<{
    username: string;
    password: string;
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    avatar: File | null;
  }>({
    initialValues: {
      username: user?.username || '',
      password: '',
      role: user?.role || 'USER',
      avatar: null,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (!user) return;

    let avatar64: string | null = null;
    if (values.avatar) {
      if (!values.avatar.type.startsWith('image/')) return form.setFieldError('avatar', 'Invalid file type');

      try {
        const res = await readToDataURL(values.avatar);
        avatar64 = res;
      } catch (e) {
        console.error(e);

        return form.setFieldError('avatar', 'Failed to read avatar file');
      }
    }

    const { data, error } = await fetchApi<Response['/api/users/[id]']>(`/api/users/${user.id}`, 'PATCH', {
      ...(values.username !== user.username && { username: values.username }),
      ...(values.password && { password: values.password }),
      ...(values.role !== user.role && { role: values.role }),
      ...(avatar64 && { avatar: avatar64 }),
    });

    if (error) {
      notifications.show({
        title: 'Failed to edit user',
        message: error.message,
        color: 'red',
        icon: <IconUserCancel size='1rem' />,
      });
    } else {
      notifications.show({
        title: 'User edited',
        message: `User ${data?.username} has been edited`,
        color: 'blue',
        icon: <IconUserEdit size='1rem' />,
      });

      form.reset();
      onClose();
      mutate('/api/users?noincl=true');
    }
  };

  return (
    <Modal centered title={<Title>Edit {user?.username ?? ''}</Title>} onClose={onClose} opened={opened}>
      <Text size='sm' color='dimmed'>
        Any fields that are blank will be omitted, and will not be updated.
      </Text>

      {user ? (
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack spacing='sm'>
            <TextInput
              label='Username'
              placeholder='Enter a username...'
              {...form.getInputProps('username')}
            />
            <PasswordInput
              label='Password'
              placeholder='Enter a password...'
              {...form.getInputProps('password')}
            />
            <FileInput
              label='Avatar'
              placeholder='Select an avatar...'
              rightSection={
                <Tooltip label='Clear avatar'>
                  <ActionIcon
                    variant='transparent'
                    disabled={!form.values.avatar}
                    onClick={() => form.setFieldValue('avatar', null)}
                  >
                    <IconPhotoMinus size='1rem' />
                  </ActionIcon>
                </Tooltip>
              }
              {...form.getInputProps('avatar')}
            />

            <Select
              label='Role'
              defaultValue={user.role}
              data={[
                { value: 'USER', label: 'User' },
                {
                  value: 'ADMIN',
                  label: 'Administrator',
                  disabled: !canInteract(currentUser?.role, 'ADMIN'),
                },
              ]}
              {...form.getInputProps('role')}
            />

            <Button
              type='submit'
              variant='outline'
              color='blue'
              radius='sm'
              leftIcon={<IconUserEdit size='1rem' />}
            >
              Update user
            </Button>
          </Stack>
        </form>
      ) : null}
    </Modal>
  );
}
