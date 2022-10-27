import { Button, Center, TextInput, Title, PasswordInput, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import Link from 'next/link';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import { GitHubIcon, DiscordIcon } from 'components/icons';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function Login({ title, user_registration, oauth_registration, oauth_providers: unparsed }) {
  const router = useRouter();

  const oauth_providers = JSON.parse(unparsed);

  const icons = {
    GitHub: GitHubIcon,
    Discord: DiscordIcon,
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
    const username = values.username.trim();
    const password = values.password.trim();

    if (username === '') return form.setFieldError('username', "Username can't be nothing");

    const res = await useFetch('/api/auth/login', 'POST', {
      username,
      password,
    });

    if (res.error) {
      if (res.error.startsWith('403')) {
        form.setFieldError('password', 'Invalid password');
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

  return (
    <>
      <Head>
        <title>{title} - Login</title>
      </Head>
      <Center sx={{ height: '100vh' }}>
        <div>
          <Title align='center'>{title}</Title>
          <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
            <TextInput size='lg' id='username' label='Username' {...form.getInputProps('username')} />
            <PasswordInput size='lg' id='password' label='Password' {...form.getInputProps('password')} />

            <Button size='lg' type='submit' fullWidth mt='sm'>
              Login
            </Button>
          </form>
          {user_registration && (
            <>
              <Divider label='or' labelPosition='center' my='sm' />
              <Link href='/auth/register' passHref legacyBehavior>
                <Button size='lg' fullWidth component='a'>
                  Register
                </Button>
              </Link>
            </>
          )}
          {oauth_registration && (
            <>
              <Divider label='or' labelPosition='center' my='sm' />
              {oauth_providers.map(({ url, name, Icon }, i) => (
                <Link key={i} href={url} passHref legacyBehavior>
                  <Button size='lg' fullWidth leftIcon={<Icon />} component='a' my={8}>
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
