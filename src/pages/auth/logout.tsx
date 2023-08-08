import { useUserStore } from '@/lib/store/user';
import { LoadingOverlay } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { mutate } from 'swr';

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
