import LanguageSelect from '@/components/LanguageSelect';
import type { Response as ApiResponse } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useUserStore } from '@/lib/client/store/user';
import {
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconLogin, IconUserPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, redirect, useNavigate } from 'react-router-dom';
import { mutate } from 'swr';

export async function loader() {
  const res = await fetch('/api/server/public');
  if (!res.ok) {
    throw new Response('Failed to fetch server settings', { status: res.status });
  }

  const data = await res.json();
  if (!data.firstSetup) return redirect('/auth/login');

  return {};
}

export function Component() {
  const { t } = useTranslation(['auth', 'common']);
  useTitle(t('setup.pageTitle'));

  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const form = useForm({
    initialValues: { username: '', password: '', confirmPassword: '' },
    validate: {
      username: (value) => (value.trim() ? null : t('form.username.required')),
      password: (value) => (value.trim() ? null : t('form.password.required')),
      confirmPassword: (value, values) => (value === values.password ? null : t('setup.passwordMismatch')),
    },
    enhanceGetInputProps: ({ field }) => ({ name: field }),
  });

  const onSubmit = async (values: typeof form.values) => {
    if (loading || created) return;
    setLoading(true);
    const credentials = { username: values.username.trim(), password: values.password.trim() };

    try {
      const setup = await fetchApi<ApiResponse['/api/setup']>('/api/setup', 'POST', credentials);
      if (setup.error || !setup.data?.user) throw new Error(setup.error?.error ?? t('setup.failure'));

      setCreated(true);

      await mutate<ApiResponse['/api/server/public']>(
        '/api/server/public',
        (config) => (config ? { ...config, firstSetup: false } : config),
        { revalidate: false },
      );

      const login = await fetchApi<ApiResponse['/api/auth/login']>('/api/auth/login', 'POST', credentials);
      if (login.error || !login.data?.user) throw new Error(login.error?.error ?? t('login.failed'));

      setUser(login.data.user);

      await mutate('/api/user', login.data, { revalidate: false });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      notifications.show({
        title: t('common:status.error'),
        message: error instanceof Error ? error.message : t('setup.failure'),
        color: 'red',
        icon: <IconX size='1rem' />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size='xs' my={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
      <Paper withBorder p={{ base: 'md', sm: 'xl' }}>
        <Stack gap='lg'>
          <div>
            <Group justify='space-between' align='flex-start' gap='sm' wrap='nowrap'>
              <Title order={1} miw={0} textWrap='balance'>
                {created ? t('setup.complete.title') : t('setup.title')}
              </Title>
              <LanguageSelect />
            </Group>
            <Text size='sm' c='dimmed' mt={4}>
              {created ? t('setup.accountCreated') : t('setup.description')}
            </Text>
          </div>

          {created ? (
            loading ? (
              <Group component='output' gap='sm'>
                <Loader size='sm' />
                <Text size='sm'>{t('setup.complete.loggingIn')}</Text>
              </Group>
            ) : (
              <Button component={Link} to='/auth/login?local=true' leftSection={<IconLogin size='1rem' />}>
                {t('login.submit')}
              </Button>
            )
          ) : (
            <form onSubmit={form.onSubmit(onSubmit)}>
              <Stack gap='sm'>
                <TextInput
                  label={t('form.username.label')}
                  placeholder={t('setup.createUser.usernamePlaceholder')}
                  autoComplete='username'
                  disabled={loading}
                  {...form.getInputProps('username')}
                />
                <PasswordInput
                  label={t('form.password.label')}
                  placeholder={t('setup.createUser.passwordPlaceholder')}
                  autoComplete='new-password'
                  disabled={loading}
                  {...form.getInputProps('password')}
                />
                <PasswordInput
                  label={t('setup.confirmPassword')}
                  autoComplete='new-password'
                  disabled={loading}
                  {...form.getInputProps('confirmPassword')}
                />
                <Button
                  type='submit'
                  size='md'
                  fullWidth
                  mt='xs'
                  loading={loading}
                  leftSection={<IconUserPlus size='1rem' />}
                >
                  {t('setup.submit')}
                </Button>
              </Stack>
            </form>
          )}

          <Anchor
            size='sm'
            ta='center'
            href='https://zipline.diced.sh/docs/config'
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('setup.welcome.docs.title')}
          </Anchor>
        </Stack>
      </Paper>
    </Container>
  );
}

Component.displayName = 'Setup';
