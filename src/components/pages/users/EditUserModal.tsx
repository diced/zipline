import { Response } from '@/lib/api/response';
import { readToDataURL } from '@/lib/base64';
import { bytes } from '@/lib/bytes';
import { User } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { canInteract } from '@/lib/role';
import { useUserStore } from '@/lib/store/user';
import {
  ActionIcon,
  Button,
  Divider,
  FileInput,
  Modal,
  NumberInput,
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
import { useEffect } from 'react';
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
    fileType: 'BY_BYTES' | 'BY_FILES' | 'NONE';
    maxFiles: number;
    maxBytes: string;
    maxUrls: number;
  }>({
    initialValues: {
      username: user?.username || '',
      password: '',
      role: user?.role || 'USER',
      avatar: null,
      fileType: user?.quota?.filesQuota || 'NONE',
      maxFiles: user?.quota?.maxFiles || 0,
      maxBytes: user?.quota?.maxBytes || '',
      maxUrls: user?.quota?.maxUrls || 0,
    },
    validate: {
      maxBytes(value, values) {
        if (values.fileType !== 'BY_BYTES') return;
        if (typeof value !== 'string') return 'Invalid value';
        const byte = bytes(value);
        if (!bytes || byte < 0) return 'Invalid byte format';
      },
      maxFiles(value, values) {
        if (values.fileType !== 'BY_FILES') return;
        if (typeof value !== 'number' || value < 0) return 'Invalid value';
      },
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (!user) return;

    console.log(values);

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

    const finalQuota: {
      filesType?: 'BY_BYTES' | 'BY_FILES' | 'NONE';
      maxFiles?: number | null;
      maxBytes?: string | null;

      maxUrls?: number | null;
    } = {};

    if (values.fileType === 'NONE') {
      finalQuota.filesType = 'NONE';
      finalQuota.maxFiles = null;
      finalQuota.maxBytes = null;
      finalQuota.maxUrls = null;
    } else if (values.fileType === 'BY_BYTES') {
      finalQuota.filesType = 'BY_BYTES';
      finalQuota.maxBytes = values.maxBytes;
    } else {
      finalQuota.filesType = 'BY_FILES';
      finalQuota.maxFiles = values.maxFiles;
    }

    if (values.maxUrls) finalQuota.maxUrls = values.maxUrls > 0 ? values.maxUrls : null;

    const { data, error } = await fetchApi<Response['/api/users/[id]']>(`/api/users/${user.id}`, 'PATCH', {
      ...(values.username !== user.username && { username: values.username }),
      ...(values.password && { password: values.password }),
      ...(values.role !== user.role && { role: values.role }),
      ...(avatar64 && { avatar: avatar64 }),
      quota: finalQuota,
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

  useEffect(() => {
    form.setValues({
      username: user?.username || '',
      password: '',
      role: user?.role || 'USER',
      avatar: null,
      fileType: user?.quota?.filesQuota || 'NONE',
      maxFiles: user?.quota?.maxFiles || 0,
      maxBytes: user?.quota?.maxBytes || '',
      maxUrls: user?.quota?.maxUrls || 0,
    });
  }, [user]);

  return (
    <Modal centered title={<Title>Edit {user?.username ?? ''}</Title>} onClose={onClose} opened={opened}>
      <Text size='sm' c='dimmed'>
        Any fields that are blank will be omitted, and will not be updated.
      </Text>

      {user ? (
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap='sm'>
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

            <Divider />
            <Title order={4}>Quota</Title>

            <Select
              label='File Quota Type'
              description='Whether to set a quota on files by total bytes or the total number of files.'
              data={[
                { value: 'BY_BYTES', label: 'By Bytes' },
                { value: 'BY_FILES', label: 'By File Count' },
                { value: 'NONE', label: 'No File Quota' },
              ]}
              {...form.getInputProps('fileType')}
            />
            {form.values.fileType === 'BY_FILES' ? (
              <NumberInput
                label='Max Files'
                description='The maximum number of files the user can upload.'
                placeholder='Enter a number...'
                mx='lg'
                min={0}
                {...form.getInputProps('maxFiles')}
              />
            ) : form.values.fileType === 'BY_BYTES' ? (
              <TextInput
                label='Max Bytes'
                description='The maximum number of bytes the user can upload.'
                placeholder='Enter a human readable byte-format...'
                mx='lg'
                {...form.getInputProps('maxBytes')}
              />
            ) : null}

            <NumberInput
              label='Max URLs'
              placeholder='Enter a number...'
              {...form.getInputProps('maxUrls')}
            />

            <Button
              type='submit'
              variant='outline'
              color='blue'
              radius='sm'
              leftSection={<IconUserEdit size='1rem' />}
            >
              Update user
            </Button>
          </Stack>
        </form>
      ) : null}
    </Modal>
  );
}
