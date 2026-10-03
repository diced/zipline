import GridTableSwitcher from '@/components/GridTableSwitcher';
import { readToDataURL } from '@/lib/base64';
import { LimitedUser } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { canInteract } from '@/lib/role';
import { useUserStore } from '@/lib/client/store/user';
import { useViewStore } from '@/lib/client/store/view';
import {
  ActionIcon,
  Button,
  FileInput,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPhotoMinus, IconUserCancel, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import UserGridView from './views/UserGridView';
import UserTableView from './views/UserTableView';

export default function DashboardUsers() {
  const { t } = useTranslation(['users', 'common']);
  const currentUser = useUserStore((state) => state.user);
  const view = useViewStore((state) => state.users);
  const [open, setOpen] = useState(false);

  const form = useForm<{
    username: string;
    password: string;
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    avatar: File | null;
  }>({
    initialValues: {
      username: '',
      password: '',
      role: 'USER',
      avatar: null,
    },
    validate: {
      username: (value) => (value.length < 1 ? t('form.username.required') : null),
      password: (value) => (value.length < 1 ? t('form.password.required') : null),
    },
    enhanceGetInputProps: ({ field }) => ({
      name: field,
    }),
  });

  const onSubmit = async (values: typeof form.values) => {
    let avatar64: string | null = null;
    if (values.avatar) {
      if (!values.avatar.type.startsWith('image/'))
        return form.setFieldError('avatar', t('form.avatar.invalidType'));

      try {
        const res = await readToDataURL(values.avatar);
        avatar64 = res;
      } catch (e) {
        console.error(e);

        return form.setFieldError('avatar', t('form.avatar.readFailed'));
      }
    }

    const { data, error } = await fetchApi<LimitedUser>('/api/users', 'POST', {
      username: values.username,
      password: values.password,
      role: values.role ?? 'USER',
      ...(avatar64 ? { avatar: avatar64 } : {}),
    });

    if (error) {
      notifications.show({
        title: t('notifications.createFailed'),
        message: error.error,
        color: 'red',
        icon: <IconUserCancel size='1rem' />,
      });
    } else {
      notifications.show({
        title: t('notifications.created.title'),
        message: t('notifications.created.message', { username: data?.username }),
        color: 'blue',
        icon: <IconUserPlus size='1rem' />,
      });

      form.reset();
      setOpen(false);
      mutate('/api/users?noincl=true');
    }
  };

  return (
    <>
      <Modal centered opened={open} onClose={() => setOpen(false)} title={t('create.title')}>
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
              defaultValue={'USER'}
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

            <Button type='submit' variant='outline' leftSection={<IconUserPlus size='1rem' />}>
              {t('common:actions.create')}
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>{t('title')}</Title>

        <Button
          variant='outline'
          size='compact-sm'
          leftSection={<IconUserPlus size='1rem' />}
          onClick={() => setOpen(true)}
        >
          {t('common:actions.create')}
        </Button>

        <GridTableSwitcher type='users' />
      </Group>

      {view === 'grid' ? <UserGridView /> : <UserTableView />}
    </>
  );
}
