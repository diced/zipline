import { Button, Center, TextInput, Title, PasswordInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import Link from 'next/link';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function Login({ oauth_registration }) {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async values => {
    const username = values.username.trim();
    const password = values.password.trim();

    if (username === '') return form.setFieldError('username', 'Username can\'t be nothing');

    const res = await useFetch('/api/auth/login', 'POST', {
      username, password,
    });

    if (res.error) {
      if (res.error.startsWith('403')) {
        form.setFieldError('password', 'Invalid password');
      } else {
        form.setFieldError('username', 'Invalid username');
        form.setFieldError('password', 'Invalid password');
      }
    } else {
      await router.push(router.query.url as string || '/dashboard');
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
      <Center sx={{ height: '100vh' }}>
        <div>
          <Title align='center'>Zipline</Title>
          <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
            <TextInput size='lg' id='username' label='Username' {...form.getInputProps('username')} />
            <PasswordInput size='lg' id='password' label='Password' {...form.getInputProps('password')} />

            <Button size='lg' type='submit' fullWidth mt={12}>Login</Button>
          </form>
          {oauth_registration && (
            <Link href='/auth/register' passHref>
              <Button size='lg' fullWidth mt={12} component='a'>Register</Button>
            </Link>
          )}
        </div>
      </Center>
    </>
  );
}