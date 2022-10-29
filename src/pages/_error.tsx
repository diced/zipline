import React from 'react';
import { Button, Stack, Title } from '@mantine/core';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import Head from 'next/head';

export default function Error({ statusCode }) {
  return (
    <>
      <Head>
        <title>{statusCode} Error</title>
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
        <Title sx={{ fontSize: 220, fontWeight: 900, lineHeight: 0.8 }}>{statusCode}</Title>
        <MutedText sx={{ fontSize: 40, fontWeight: 500 }}>Something went wrong...</MutedText>
        <Button component={Link} href='/dashboard'>
          Head to the Dashboard
        </Button>
      </Stack>
    </>
  );
}

export function getInitialProps({ res, err }) {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { pageProps: { statusCode } };
}

Error.title = 'Zipline - Something went wrong...';
