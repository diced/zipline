import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoadingOverlay } from '@mantine/core';
import { useStoreDispatch } from 'lib/redux/store';
import { updateUser } from 'lib/redux/reducers/user';

export default function Logout() {
  const dispatch = useStoreDispatch();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        const res = await fetch('/api/auth/logout');
        if (res.ok) {
          dispatch(updateUser(null));
          router.push('/auth/login');
        }
      } else {
        router.push('/auth/login');
      }
    })();
  }, []);

  return (
    <LoadingOverlay visible={true} />
  );
}

Logout.title = 'Zipline - Logout';