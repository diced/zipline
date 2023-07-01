import {
  Box,
  Button,
  Center,
  Group,
  LoadingOverlay,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { Response } from '@/lib/api/response';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import {
  IconBrandGithubFilled,
  IconBrandGoogle,
  IconBrandDiscordFilled,
  IconCircleKeyFilled,
  Icon as TIcon,
} from '@tabler/icons-react';
import { hasLength, useForm } from '@mantine/form';
import { fetchApi } from '@/lib/fetchApi';

function IconText({ Icon, text }: { Icon: TIcon; text: string }) {
  return (
    <Group spacing='xs' align='center'>
      <Icon />
      <Text>{text}</Text>
    </Group>
  );
}

export default function Login() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<Response['/api/user']>('/api/user');

  useEffect(() => {
    if (data?.user) {
      router.push('/dashboard');
    }
  }, [data]);

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
    const { username, password } = values;

    const { data, error } = await fetchApi<Response['/api/auth/login']>('/api/auth/login', 'POST', {
      username,
      password,
    });

    if (error) {
      if (error.username) form.setFieldError('username', 'Invalid username');
      else if (error.password) form.setFieldError('password', 'Invalid password');
    } else {
      mutate(data as Response['/api/user']);
    }
  };

  return (
    <>
      <LoadingOverlay visible={isLoading} />

      <Center h='100vh'>
        <div>
          <Title order={1} size={50} align='center'>
            <b>Zipline</b>
          </Title>

          <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack my='sm'>
              <TextInput
                size='lg'
                placeholder='Enter your username...'
                {...form.getInputProps('username', { withError: true })}
              />

              <PasswordInput
                size='lg'
                placeholder='Enter your password...'
                {...form.getInputProps('password')}
              />

              <Button size='lg' fullWidth type='submit'>
                Login
              </Button>
            </Stack>
          </form>

          <Text size='sm' align='center' color='dimmed'>
            OR
          </Text>

          <Stack my='xs'>
            <Button size='lg' fullWidth variant='outline'>
              Sign up
            </Button>
            <Button size='lg' fullWidth variant='outline'>
              <IconText Icon={IconBrandGithubFilled} text='Sign in with GitHub' />
            </Button>
            <Button size='lg' fullWidth variant='outline'>
              <IconText Icon={IconBrandGoogle} text='Sign in with Google' />
            </Button>
            <Button size='lg' fullWidth variant='outline'>
              <IconText Icon={IconBrandDiscordFilled} text='Sign in with Discord' />
            </Button>
            <Button size='lg' fullWidth variant='outline'>
              <IconText Icon={IconCircleKeyFilled} text='Sign in with Authentik' />
            </Button>
          </Stack>
        </div>
      </Center>
    </>
  );
}
