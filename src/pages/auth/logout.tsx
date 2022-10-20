import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '@mantine/core';
import { useSetRecoilState } from 'recoil';
import { userSelector } from 'lib/recoil/user';

export default function Logout() {
  const setUser = useSetRecoilState(userSelector);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        const res = await fetch('/api/auth/logout');
        if (res.ok) {
          setUser(null);
          router.push('/auth/login');
        }
      } else {
        router.push('/auth/login');
      }
    })();
  }, []);

  return <LoadingOverlay visible={true} />;
}

Logout.title = 'Zipline - Logout';
