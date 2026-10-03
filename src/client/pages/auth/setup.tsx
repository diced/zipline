import LanguageSelect from '@/components/LanguageSelect';
import { type Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useTitle } from '@/lib/client/hooks/useTitle';
import {
  Anchor,
  Button,
  Code,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowBackUp, IconArrowForwardUp, IconCheck, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';
import { redirect, useNavigate } from 'react-router-dom';
import { mutate } from 'swr';

function LinkToDoc({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Text>
      <Anchor href={href} target='_blank' rel='noopener noreferrer'>
        {title}
      </Anchor>{' '}
      {children}
    </Text>
  );
}

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

  const [active, setActive] = useState(0);
  const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => (value.length >= 1 ? null : t('form.username.required')),
      password: (value) => (value.length >= 1 ? null : t('form.password.required')),
    },
    enhanceGetInputProps: ({ field }) => ({
      name: field,
    }),
  });

  const onSubmit = async (values: typeof form.values) => {
    setLoading(true);

    const { error } = await fetchApi('/api/setup', 'POST', {
      username: values.username,
      password: values.password,
    });

    if (error) {
      notifications.show({
        title: t('common:status.error'),
        message: error.error,
        color: 'red',
        icon: <IconX size='1rem' />,
      });

      setLoading(false);
      setActive(2);
    } else {
      notifications.show({
        title: t('setup.complete.title'),
        message: t('setup.complete.loggingIn'),
        color: 'green',
        loading: true,
      });

      const { data, error } = await fetchApi<Response['/api/auth/login']>('/api/auth/login', 'POST', {
        username: values.username,
        password: values.password,
      });

      if (error) {
        notifications.show({
          title: t('common:status.error'),
          message: error.error,
          color: 'red',
          icon: <IconX size='1rem' />,
        });

        setLoading(false);
        setActive(2);
      } else {
        mutate('/api/user', data as Response['/api/user']);
        navigate('/dashboard');
      }
    }
  };

  return (
    <>
      <Group justify='flex-end' mx='sm' mt='sm'>
        <LanguageSelect />
      </Group>

      <Paper withBorder p='xs' m='sm'>
        <Stepper active={active} onStepClick={setActive} m='md'>
          <Stepper.Step
            label={t('setup.steps.welcome.label')}
            description={t('setup.steps.welcome.description')}
          >
            <Title>{t('setup.welcome.title')}</Title>
            <SimpleGrid spacing='md' cols={{ base: 1, sm: 1 }}>
              <Paper withBorder p='sm' my='sm' h='100%'>
                <Title order={2}>{t('setup.welcome.docs.title')}</Title>
                <Text>{t('setup.welcome.docs.intro')}</Text>

                <Stack mt='xs'>
                  <LinkToDoc
                    href='https://zipline.diced.sh/docs/config'
                    title={t('setup.welcome.docs.config.title')}
                  >
                    {t('setup.welcome.docs.config.description')}
                  </LinkToDoc>

                  <LinkToDoc
                    href='https://zipline.diced.sh/docs/migrate'
                    title={t('setup.welcome.docs.migrate.title')}
                  >
                    {t('setup.welcome.docs.migrate.description')}
                  </LinkToDoc>
                </Stack>
              </Paper>

              <Paper withBorder p='sm' my='sm' h='100%'>
                <Title order={2}>{t('setup.welcome.config.title')}</Title>

                <Text>
                  <SafeTrans t={t} i18nKey='setup.welcome.config.body' components={{ code: <Code /> }} />
                </Text>

                <Text>
                  <SafeTrans
                    t={t}
                    i18nKey='setup.welcome.config.envVars'
                    components={{
                      anchor: (
                        <Anchor
                          href='https://zipline.diced.sh/docs/config'
                          target='_blank'
                          rel='noopener noreferrer'
                        />
                      ),
                    }}
                  />
                </Text>
              </Paper>
            </SimpleGrid>

            <Button
              mt='xl'
              fullWidth
              rightSection={<IconArrowForwardUp size='1.25rem' />}
              size='lg'
              variant='default'
              onClick={nextStep}
            >
              {t('common:actions.continue')}
            </Button>
          </Stepper.Step>
          <Stepper.Step
            label={t('setup.steps.createUser.label')}
            description={t('setup.steps.createUser.description')}
          >
            <Stack gap='lg'>
              <Title order={2}>{t('setup.createUser.title')}</Title>

              <TextInput
                label={t('form.username.label')}
                placeholder={t('setup.createUser.usernamePlaceholder')}
                autoComplete='username'
                {...form.getInputProps('username')}
              />

              <PasswordInput
                label={t('form.password.label')}
                placeholder={t('setup.createUser.passwordPlaceholder')}
                autoComplete='new-password'
                {...form.getInputProps('password')}
              />
            </Stack>

            <Group justify='space-between' my='lg'>
              <Button
                leftSection={<IconArrowBackUp size='1.25rem' />}
                size='lg'
                variant='default'
                onClick={prevStep}
              >
                {t('setup.back')}
              </Button>

              <Button
                rightSection={<IconArrowForwardUp size='1.25rem' />}
                size='lg'
                variant='default'
                onClick={nextStep}
                disabled={!form.isValid()}
              >
                {t('common:actions.continue')}
              </Button>
            </Group>
          </Stepper.Step>
          <Stepper.Completed>
            <Title order={2}>{t('setup.complete.title')}</Title>

            <Text>{t('setup.complete.body')}</Text>
            <Group justify='space-between' my='lg'>
              <Button
                leftSection={<IconArrowBackUp size='1.25rem' />}
                size='lg'
                variant='default'
                onClick={prevStep}
                loading={loading}
              >
                {t('setup.back')}
              </Button>

              <Button
                rightSection={<IconCheck size='1.25rem' />}
                size='lg'
                variant='default'
                loading={loading}
                onClick={() => form.onSubmit(onSubmit)()}
              >
                {t('setup.finish')}
              </Button>
            </Group>
          </Stepper.Completed>
        </Stepper>
      </Paper>
    </>
  );
}

Component.displayName = 'Setup';
