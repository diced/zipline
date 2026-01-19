import { type Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useTitle } from '@/lib/hooks/useTitle';
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
  useTitle('Setup');

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
      username: (value) => (value.length < 1 ? 'Username is required' : null),
      password: (value) => (value.length < 1 ? 'Password is required' : null),
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
        title: 'Error',
        message: error.error,
        color: 'red',
        icon: <IconX size='1rem' />,
      });

      setLoading(false);
      setActive(2);
    } else {
      notifications.show({
        title: 'Setup complete!',
        message: 'Logging in to new user...',
        color: 'green',
        loading: true,
      });

      const { data, error } = await fetchApi<Response['/api/auth/login']>('/api/auth/login', 'POST', {
        username: values.username,
        password: values.password,
      });

      if (error) {
        notifications.show({
          title: 'Error',
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
      <Paper withBorder p='xs' m='sm'>
        <Stepper active={active} onStepClick={setActive} m='md'>
          <Stepper.Step label='Welcome!' description='Setup Zipline'>
            <Title>Welcome to Zipline!</Title>
            <SimpleGrid spacing='md' cols={{ base: 1, sm: 1 }}>
              <Paper withBorder p='sm' my='sm' h='100%'>
                <Title order={2}>Documentation</Title>
                <Text>Here are a couple of useful documentation links to get you started with Zipline:</Text>

                <Stack mt='xs'>
                  <LinkToDoc href='https://zipline.diced.sh/docs/config' title='Configuration'>
                    Configuring Zipline to your needs
                  </LinkToDoc>

                  <LinkToDoc href='https://zipline.diced.sh/docs/migrate' title='Migrate from v3 to v4'>
                    Upgrading from a previous version of Zipline
                  </LinkToDoc>
                </Stack>
              </Paper>

              <Paper withBorder p='sm' my='sm' h='100%'>
                <Title order={2}>Configuration</Title>

                <Text>
                  Most of Zipline&apos;s configuration is now managed through the dashboard. Once you login as
                  a super-admin, you can click on your username in the top right corner and select
                  &quot;Server Settings&quot; to configure your instance. The only exception to this is a few
                  sensitive environment variables that must be set in order for Zipline to run. To change
                  this, depending on the setup, you can either edit the <Code>.env</Code> or{' '}
                  <Code>docker-compose.yml</Code> file.
                </Text>

                <Text>
                  To see all of the available environment variables, please refer to the documentation{' '}
                  <Anchor
                    href='https://zipline.diced.sh/docs/config'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    here.
                  </Anchor>
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
              Continue
            </Button>
          </Stepper.Step>
          <Stepper.Step label='Create user' description='Create a super-admin account'>
            <Stack gap='lg'>
              <Title order={2}>Create your super-admin account</Title>

              <TextInput
                label='Username'
                placeholder='Enter a username...'
                autoComplete='username'
                {...form.getInputProps('username')}
              />

              <PasswordInput
                label='Password'
                placeholder='Enter a password...'
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
                Back
              </Button>

              <Button
                rightSection={<IconArrowForwardUp size='1.25rem' />}
                size='lg'
                variant='default'
                onClick={nextStep}
                disabled={!form.isValid()}
              >
                Continue
              </Button>
            </Group>
          </Stepper.Step>
          <Stepper.Completed>
            <Title order={2}>Setup complete!</Title>

            <Text>
              Clicking &quot;Finish&quot; below will create your super-admin account and log you in. You will
              be redirected to the dashboard shortly after that.
            </Text>
            <Group justify='space-between' my='lg'>
              <Button
                leftSection={<IconArrowBackUp size='1.25rem' />}
                size='lg'
                variant='default'
                onClick={prevStep}
                loading={loading}
              >
                Back
              </Button>

              <Button
                rightSection={<IconCheck size='1.25rem' />}
                size='lg'
                variant='default'
                loading={loading}
                onClick={() => form.onSubmit(onSubmit)()}
              >
                Finish
              </Button>
            </Group>
          </Stepper.Completed>
        </Stepper>
      </Paper>
    </>
  );
}

Component.displayName = 'Setup';
