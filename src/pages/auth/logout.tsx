import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/store/user';
import { Group, LoadingOverlay, Text } from '@mantine/core';
import { Icon as TIcon } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { mutate } from 'swr';

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
  const [setUser, setToken] = useUserStore((state) => [state.setUser, state.setToken]);

  useEffect(() => {
    (async () => {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        const res = await fetch('/api/auth/logout');

        if (res.ok) {
          setUser(null);
          setToken(null);
          mutate('/api/user', null);
        }
      } else {
        await router.push('/auth/login');
      }
    })();
  });

  return (
    <>
      <LoadingOverlay visible />
    </>
  );
}
