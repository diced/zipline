import { Response } from '@/lib/api/response';
import { readToDataURL } from '@/lib/base64';
import { bytes } from '@/lib/bytes';
import { LimitedUser } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { canInteract } from '@/lib/role';
import { useUserStore } from '@/lib/client/store/user';
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
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';

export default function EditUserModal({
  user,
  opened,
  onClose,
}: {
  user?: LimitedUser | null;
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('users');
  const currentUser = useUserStore((state) => state.user);

  const derivedFileType: 'BY_BYTES' | 'BY_FILES' | 'NONE' = useMemo(() => {
    if (user?.quota?.maxBytes != null) return 'BY_BYTES';
    if (user?.quota?.maxFiles != null) return 'BY_FILES';
    return 'NONE';
  }, [user]);

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
      fileType: derivedFileType,
      maxFiles: user?.quota?.maxFiles ?? 0,
      maxBytes: user?.quota?.maxBytes ?? '',
      maxUrls: user?.quota?.maxUrls ?? 0,
    },
    validate: {
      maxBytes(value, values) {
        if (values.fileType !== 'BY_BYTES') return;
        if (typeof value !== 'string') return t('edit.quota.invalidValue');
        const byte = bytes(value);
        if (!bytes || byte < 0) return t('edit.quota.invalidByteFormat');
      },
      maxFiles(value, values) {
        if (values.fileType !== 'BY_FILES') return;
        if (typeof value !== 'number' || value < 0) return t('edit.quota.invalidValue');
      },
    },
    enhanceGetInputProps: ({ field }) => ({
      name: field,
    }),
  });

  useEffect(() => {
    form.setValues({
      username: user?.username || '',
      password: '',
      role: user?.role || 'USER',
      avatar: null,
      fileType:
        user?.quota?.maxBytes != null ? 'BY_BYTES' : user?.quota?.maxFiles != null ? 'BY_FILES' : 'NONE',
      maxFiles: user?.quota?.maxFiles ?? 0,
      maxBytes: user?.quota?.maxBytes ?? '',
      maxUrls: user?.quota?.maxUrls ?? 0,
    });
  }, [user]);

  const onSubmit = async (values: typeof form.values) => {
    if (!user) return;

    let avatar64: string | null = null;
    if (values.avatar) {
      if (!values.avatar.type.startsWith('image/')) {
        return form.setFieldError('avatar', t('form.avatar.invalidType'));
      }

      try {
        avatar64 = await readToDataURL(values.avatar);
      } catch (e) {
        console.error(e);
        return form.setFieldError('avatar', t('form.avatar.readFailed'));
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
    }

    if (values.fileType === 'BY_BYTES') {
      finalQuota.filesType = 'BY_BYTES';
      finalQuota.maxBytes = values.maxBytes;
      finalQuota.maxFiles = null;
    }

    if (values.fileType === 'BY_FILES') {
      finalQuota.filesType = 'BY_FILES';
      finalQuota.maxFiles = values.maxFiles;
      finalQuota.maxBytes = null;
    }

    if (values.maxUrls) {
      finalQuota.maxUrls = values.maxUrls > 0 ? values.maxUrls : null;
    }

    const { data, error } = await fetchApi<Response['/api/users/[id]']>(`/api/users/${user.id}`, 'PATCH', {
      ...(values.username !== user.username && { username: values.username }),
      ...(values.password && { password: values.password }),
      ...(values.role !== user.role && { role: values.role }),
      ...(avatar64 && { avatar: avatar64 }),
      quota: finalQuota,
    });

    if (error) {
      notifications.show({
        title: t('notifications.editFailed'),
        message: error.error,
        color: 'red',
        icon: <IconUserCancel size='1rem' />,
      });
    } else {
      notifications.show({
        title: t('notifications.edited.title'),
        message: t('notifications.edited.message', { username: data?.username }),
        color: 'blue',
        icon: <IconUserEdit size='1rem' />,
      });

      form.reset();
      onClose();
      mutate('/api/users?noincl=true');
    }
  };

  return (
    <Modal
      centered
      title={t('edit.title', { username: user?.username ?? '' })}
      onClose={onClose}
      opened={opened}
    >
      <Text size='sm' mt={-5} my='sm' c='dimmed'>
        {t('edit.description')}
      </Text>

      {user ? (
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap='sm'>
            <TextInput
              label={t('form.username.label')}
              placeholder={t('form.username.placeholder')}
              autoComplete='username'
              {...form.getInputProps('username')}
            />

            <PasswordInput
              label={t('form.password.label')}
              placeholder={t('form.password.placeholder')}
              autoComplete='new-password'
              {...form.getInputProps('password')}
            />

            <FileInput
              label={t('form.avatar.label')}
              placeholder={t('form.avatar.placeholder')}
              rightSection={
                <Tooltip label={t('form.avatar.clear')}>
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
              label={t('form.role.label')}
              defaultValue={user.role}
              data={[
                { value: 'USER', label: t('roles.user') },
                {
                  value: 'ADMIN',
                  label: t('roles.administrator'),
                  disabled: !canInteract(currentUser?.role, 'ADMIN'),
                },
              ]}
              {...form.getInputProps('role')}
            />

            <Divider />
            <Title order={5}>{t('edit.quota.title')}</Title>

            <Select
              label={t('edit.quota.fileType.label')}
              description={t('edit.quota.fileType.description')}
              data={[
                { value: 'BY_BYTES', label: t('edit.quota.fileType.byBytes') },
                { value: 'BY_FILES', label: t('edit.quota.fileType.byFiles') },
                { value: 'NONE', label: t('edit.quota.fileType.none') },
              ]}
              {...form.getInputProps('fileType')}
            />

            {form.values.fileType !== 'NONE' && (
              <>
                {form.values.fileType === 'BY_FILES' && (
                  <NumberInput
                    label={t('edit.quota.maxFiles.label')}
                    description={t('edit.quota.maxFiles.description')}
                    placeholder={t('edit.quota.maxFiles.placeholder')}
                    mx='lg'
                    min={0}
                    {...form.getInputProps('maxFiles')}
                  />
                )}

                {form.values.fileType === 'BY_BYTES' && (
                  <TextInput
                    label={t('edit.quota.maxBytes.label')}
                    description={t('edit.quota.maxBytes.description')}
                    placeholder={t('edit.quota.maxBytes.placeholder')}
                    mx='lg'
                    {...form.getInputProps('maxBytes')}
                  />
                )}
              </>
            )}

            <NumberInput
              label={t('edit.quota.maxUrls.label')}
              placeholder={t('edit.quota.maxUrls.placeholder')}
              description={t('edit.quota.maxUrls.description')}
              {...form.getInputProps('maxUrls')}
            />
            <Divider />

            <Button type='submit' variant='outline' color='blue' leftSection={<IconUserEdit size='1rem' />}>
              {t('edit.submit')}
            </Button>
          </Stack>
        </form>
      ) : null}
    </Modal>
  );
}
