import {
  Button,
  Center,
  CheckIcon,
  Divider,
  Modal,
  NumberInput,
  PasswordInput,
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
  const [code, setCode] = useState(undefined);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);

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

  const onSubmit = async (values) => {
    setError('');
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
        } else {
          setError('');
        }

        setTotpOpen(true);
      } else {
        form.setFieldError('username', 'Invalid username');
        form.setFieldError('password', 'Invalid password');
      }
    } else {
      await router.push((router.query.url as string) || '/dashboard');
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
        <NumberInput
          placeholder='2FA Code'
          label='Verify'
          size='xl'
          hideControls
          maxLength={6}
          minLength={6}
          value={code}
          onChange={(e) => setCode(e)}
          error={error}
        />

        <Button
          disabled={disabled}
          size='lg'
          fullWidth
          mt='md'
          rightIcon={<CheckIcon />}
          onClick={() => onSubmit(form.values)}
        >
          Verify &amp; Login
        </Button>
      </Modal>
      <Center sx={{ height: '100vh' }}>
        <div>
          <Title size={70} align='center'>
            {title}
          </Title>

          <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
            <TextInput my='sm' size='lg' id='username' label='Username' {...form.getInputProps('username')} />
            <PasswordInput
              my='sm'
              size='lg'
              id='password'
              label='Password'
              {...form.getInputProps('password')}
            />

            <Button size='lg' my='sm' fullWidth type='submit'>
              Login
            </Button>
          </form>

          {user_registration && (
            <>
              <Divider my='sm' label='or' labelPosition='center'>
                or
              </Divider>
              <Link href='/auth/register' passHref legacyBehavior>
                <Button size='lg' fullWidth component='a'>
                  Register
                </Button>
              </Link>
            </>
          )}
          {oauth_registration && (
            <>
              <Divider my='sm' label='or' labelPosition='center'>
                or
              </Divider>
              {oauth_providers.map(({ url, name, Icon }, i) => (
                <Link key={i} href={url} passHref legacyBehavior>
                  <Button size='lg' fullWidth leftIcon={<Icon colorScheme='manage' />} component='a' my='sm'>
                    Login in with {name}
                  </Button>
                </Link>
              ))}
            </>
          )}
        </div>
      </Center>
    </>
  );
}
