import { useUserStore } from '@/lib/store/user';
import { LoadingOverlay } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { mutate } from 'swr';

export default function Login() {
  const router = useRouter();
  const [setUser] = useUserStore((state) => [state.setUser]);

  useEffect(() => {
    (async () => {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        const res = await fetch('/api/auth/logout');

        if (res.ok) {
          setUser(null);
          mutate('/api/user', null);
          await router.push('/auth/login');
        }
      } else {
        await router.push('/dashboard');
      }
    })();
  }, []);

  return (
    <>
      <LoadingOverlay visible />
    </>
  );
}
