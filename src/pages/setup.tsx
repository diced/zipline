import { Response } from '@/lib/api/response';
import { getZipline } from '@/lib/db/models/zipline';
import { fetchApi } from '@/lib/fetchApi';
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
import { hasLength, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowBackUp, IconArrowForwardUp, IconCheck, IconX } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';

export default function Setup() {
  const router = useRouter();

  const [active, setActive] = useState(1);
  const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: hasLength({ min: 1 }, 'Username is required'),
      password: hasLength({ min: 1 }, 'Password is required'),
    },
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
        message: error.message,
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
          message: error.message,
          color: 'red',
          icon: <IconX size='1rem' />,
        });

        setLoading(false);
        setActive(2);
      } else {
        mutate('/api/user', data as Response['/api/user']);
        router.push('/dashboard');
      }
    }
  };

  return (
    <>
      <Head>
        <title>Zipline Setup</title>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
      </Head>

      <Paper withBorder p='xs' m='sm'>
        <Stepper active={active} onStepClick={setActive} breakpoint='sm' m='md'>
          <Stepper.Step label='Welcome!' description='Setup Zipline'>
            <Title>Welcome to Zipline!</Title>
            <SimpleGrid cols={2} spacing='md' breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
              <Paper withBorder p='sm' my='sm' h='100%'>
                <Title order={2}>Documentation</Title>
                <Text>Here are a couple of useful documentation links to get you started with Zipline.</Text>

                <Text color='dimmed'>
                  <Anchor>[name]</Anchor>: desc
                </Text>

                <Text color='dimmed'>
                  <Anchor>[name]</Anchor>: desc
                </Text>
                <Text color='dimmed'>
                  <Anchor>[name]</Anchor>: desc
                </Text>
                <Text color='dimmed'>
                  <Anchor>[name]</Anchor>: desc
                </Text>
                <Text color='dimmed'>
                  <Anchor>[name]</Anchor>: desc
                </Text>
              </Paper>

              <Paper withBorder p='sm' my='sm' h='100%'>
                <Title order={2}>Configuration</Title>

                <Text>
                  Zipline's configuration is managed by environment variables. Zipline makes this easy by
                  providing support for using a <Code>.env</Code> file. When using <b>Docker Compose</b> all
                  the environment variables are found in the <Code>docker-compose.yml</Code> file.
                </Text>

                <Text>
                  To see all of the available environment variables, please refer to the documentation{' '}
                  <Anchor component={Link} href='https://zipl.vercel.app/docs/config'>
                    here.
                  </Anchor>
                </Text>
              </Paper>
            </SimpleGrid>

            <Button
              mt='xl'
              fullWidth
              rightIcon={<IconArrowForwardUp size='1.25rem' />}
              size='lg'
              variant='default'
              onClick={nextStep}
            >
              Continue
            </Button>
          </Stepper.Step>
          <Stepper.Step label='Create user' description='Create a super-admin account'>
            <Stack spacing='lg'>
              <Title order={2}>Create your super-admin account</Title>

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
            </Stack>

            <Group position='apart' my='lg'>
              <Button
                leftIcon={<IconArrowBackUp size='1.25rem' />}
                size='lg'
                variant='default'
                onClick={prevStep}
              >
                Back
              </Button>

              <Button
                rightIcon={<IconArrowForwardUp size='1.25rem' />}
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
              Clicking "continue" below will create your super-admin account and log you in. You will be
              redirected to the dashboard shortly after that.
            </Text>
            <Group position='apart' my='lg'>
              <Button
                leftIcon={<IconArrowBackUp size='1.25rem' />}
                size='lg'
                variant='default'
                onClick={prevStep}
                loading={loading}
              >
                Back
              </Button>

              <Button
                rightIcon={<IconCheck size='1.25rem' />}
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

export const getServerSideProps: GetServerSideProps = async () => {
  const { firstSetup } = await getZipline();

  if (!firstSetup)
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };

  return {
    props: {},
  };
};
