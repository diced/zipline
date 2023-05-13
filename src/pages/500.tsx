import { Button, Stack, Title, Tooltip } from '@mantine/core';
import MutedText from 'components/MutedText';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function FiveHundred() {
  const { asPath } = useRouter();
  return (
    <>
      <Head>
        <title>500 Internal Server Error</title>
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
        <Title sx={{ fontSize: 220, fontWeight: 900, lineHeight: 0.8 }}>500</Title>
        <Tooltip label={"Take a look at Zipline's logs and the browser console for more info"}>
          <MutedText>Internal server error</MutedText>
        </Tooltip>
        {asPath === '/dashboard' ? (
          <Button onClick={() => window.location.reload()}>Attempt Refresh</Button>
        ) : (
          <Button component={Link} href='/dashboard'>
            Head to the Dashboard
          </Button>
        )}
      </Stack>
    </>
  );
}
