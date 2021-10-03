import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Backdrop, CircularProgress } from '@mui/material';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        const res = await fetch('/api/auth/logout');
        if (res.ok) router.push('/auth/login');
      } else {
        router.push('/auth/login');
      }
    })();
  }, []);

  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: t => t.zIndex.drawer + 1 }}
      open
    >
      <CircularProgress color='inherit' />
    </Backdrop>
  );
}

Logout.title = 'Zipline - Logout';