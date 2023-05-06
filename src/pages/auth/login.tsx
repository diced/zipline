import {
  Anchor,
  Button,
  Card,
  Center,
  CheckIcon,
  Divider,
  Group,
  Modal,
  PasswordInput,
  PinInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBrandDiscordFilled, IconBrandGithub, IconBrandGoogle } from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function Login({
  title,
  user_registration,
  oauth_registration,
  bypass_local_login,
  oauth_providers: unparsed,
}) {
  const router = useRouter();

  // totp modal
  const [totpOpen, setTotpOpen] = useState(false);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);

  const [loading, setLoading] = useState(false);

  const oauth_providers = JSON.parse(unparsed);

  const show_local_login =
    router.query.local === 'true' || !(bypass_local_login && oauth_providers?.length > 0);

  const icons = {
    GitHub: IconBrandGithub,
    Discord: IconBrandDiscordFilled,
    Google: IconBrandGoogle,
  };

  for (const provider of oauth_providers) {
    provider.Icon = icons[provider.name];
  }

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values, code = null) => {
    setLoading(true);
    setError('');
    setDisabled(true);
    const username = values.username.trim();
    const password = values.password.trim();

    if (username === '') return form.setFieldError('username', "Username can't be nothing");

    const res = await useFetch('/api/auth/login', 'POST', {
      username,
      password,
      code: code?.toString() || null,
    });

    if (res.error) {
      if (res.code === 403) {
        form.setFieldError('password', 'Invalid password');
      } else if (res.totp) {
        if (res.code === 400) {
          setError('Invalid code');
          setDisabled(false);
          setLoading(false);
        } else {
          setError('');
          setDisabled(false);
          setLoading(false);
        }

        setTotpOpen(true);
      } else {
        form.setFieldError('username', 'Invalid username');
        form.setFieldError('password', 'Invalid password');
        setLoading(false);
      }
    } else {
      await router.push((router.query.url as string) || '/dashboard');
    }
  };

  const handlePinChange = (value) => {
    if (value.length === 6) {
      onSubmit(form.values, value);
    }
  };

  useEffect(() => {
    (async () => {
      // if the user includes `local=true` as a query param, show the login form
      // otherwise, redirect to the oauth login if there is only one registered provider
      if (bypass_local_login && oauth_providers?.length === 1 && router.query.local !== 'true') {
        await router.push(oauth_providers[0].url);
      }

      const a = await fetch('/api/user');
      if (a.ok) await router.push('/dashboard');
    })();
  }, []);

  const full_title = `${title} - Login`;
  return (
    <>
      <Head>
        <title>{full_title}</title>
      </Head>
      <Modal
        opened={totpOpen}
        onClose={() => setTotpOpen(false)}
        title={<Title order={3}>Two-Factor Authentication Required</Title>}
        size='lg'
      >
        <Center my='md'>
          <PinInput
            data-autofocus
            length={6}
            oneTimeCode
            type='number'
            placeholder=''
            onChange={handlePinChange}
            autoFocus={true}
            error={!!error}
            disabled={disabled}
            size='xl'
          />
        </Center>

        {error && (
          <Text my='sm' size='sm' color='red' align='center'>
            {error}
          </Text>
        )}

        <Button
          loading={loading}
          disabled={disabled}
          size='lg'
          fullWidth
          mt='md'
          rightIcon={<CheckIcon />}
          type='submit'
        >
          Verify &amp; Login
        </Button>
      </Modal>
      <Center sx={{ height: '100vh' }}>
        <Card radius='md'>
          <Title size={30} align='left'>
            {bypass_local_login ? ' Login to Zipline with' : 'Zipline'}
          </Title>

          {oauth_registration && (
            <>
              <Group grow>
                {oauth_providers.map(({ url, name, Icon }, i) => (
                  <Button
                    key={i}
                    size='sm'
                    variant='outline'
                    radius='md'
                    fullWidth
                    leftIcon={<Icon size='1rem' />}
                    my='xs'
                    component={Link}
                    href={url}
                  >
                    {name}
                  </Button>
                ))}
              </Group>
              {show_local_login && <Divider my='xs' label='or' labelPosition='center' />}
            </>
          )}

          {show_local_login && (
            <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
              <TextInput
                my='xs'
                radius='md'
                size='md'
                id='username'
                label='Username'
                {...form.getInputProps('username')}
              />
              <PasswordInput
                my='xs'
                radius='md'
                size='md'
                id='password'
                label='Password'
                {...form.getInputProps('password')}
              />

              <Group position='apart'>
                {user_registration && (
                  <Anchor size='xs' href='/auth/register' component={Link}>
                    Don&apos;t have an account? Register
                  </Anchor>
                )}

                <Button size='sm' p='xs' radius='md' my='xs' type='submit' loading={loading}>
                  Login
                </Button>
              </Group>
            </form>
          )}
        </Card>
      </Center>
    </>
  );
}
