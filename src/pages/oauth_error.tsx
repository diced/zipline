import { Button, Stack, Title } from '@mantine/core';
import MutedText from 'components/MutedText';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function OauthError({ error, provider }) {
  const [remaining, setRemaining] = useState(10);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (remaining > 0) setRemaining((remaining) => remaining - 1);
      else clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (remaining === 0) {
    router.push('/auth/login');
  }

  return (
    <>
      <Head>
        <title>Authentication Error</title>
      </Head>

      <Stack
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: '100vh',
          justifyContent: 'center',
          position: 'relative',
        }}
        spacing='sm'
      >
        <Title sx={{ fontSize: 50, fontWeight: 900, lineHeight: 0.8 }}>
          Error while authenticating with {provider}
        </Title>
        <MutedText sx={{ fontSize: 40, fontWeight: 500 }}>{error}</MutedText>
        <MutedText>
          Redirecting to login in {remaining} second{remaining !== 1 ? 's' : ''}
        </MutedText>
        <Button component={Link} href='/dashboard'>
          Head to the Dashboard
        </Button>
      </Stack>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      error: ctx.query.error ?? 'Unknown',
      provider: ctx.query.provider ?? 'Unknown',
    },
  };
};
