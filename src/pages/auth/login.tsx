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
import { DiscordIcon, GitHubIcon, GoogleIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function Login({ title, user_registration, oauth_registration, oauth_providers: unparsed }) {
  const router = useRouter();

  // totp modal
  const [totpOpen, setTotpOpen] = useState(false);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);

  const [loading, setLoading] = useState(false);

  const oauth_providers = JSON.parse(unparsed);

  const icons = {
    GitHub: GitHubIcon,
    Discord: DiscordIcon,
    Google: GoogleIcon,
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
            {title}
          </Title>

          {oauth_registration && (
            <>
              <Group grow>
                {oauth_providers.map(({ url, name, Icon }, i) => (
                  <Link key={i} href={url} passHref legacyBehavior>
                    <Button
                      size='sm'
                      variant='outline'
                      radius='md'
                      fullWidth
                      leftIcon={<Icon height={'15'} width={'15'} colorScheme='dark' />}
                      component='a'
                      my='xs'
                    >
                      {name}
                    </Button>
                  </Link>
                ))}
              </Group>

              <Divider my='xs' label='or' labelPosition='center' />
            </>
          )}

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
        </Card>
      </Center>
    </>
  );
}
