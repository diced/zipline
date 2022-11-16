import { LoadingOverlay } from '@mantine/core';
import { userSelector } from 'lib/recoil/user';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function Logout({ title }) {
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

  const full_title = `${title} - Logout`;

  return (
    <>
      <Head>
        <title>{full_title}</title>
      </Head>

      <LoadingOverlay visible={true} />
    </>
  );
}
