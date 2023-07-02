import { AppProps } from 'next/app';
import Head from 'next/head';
import { MantineProvider } from '@mantine/core';
import { SWRConfig } from 'swr';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';

const fetcher = async (url: RequestInfo | URL) => {
  const res = await fetch(url);

  if (!res.ok) {
    const json = await res.json();

    throw new Error(json.message);
  }

  return res.json();
};

export default function App(props: AppProps) {
  const { Component, pageProps } = props;

  return (
    <>
      <Head>
        <title>Zipline</title>
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width' />
      </Head>

      <SWRConfig
        value={{
          fetcher,
        }}
      >
        <MantineProvider
          withGlobalStyles
          withNormalizeCSS
          theme={{
            colorScheme: 'dark',
          }}
        >
          <ModalsProvider
            modalProps={{
              overlayProps: {
                blur: 3,
                opacity: 0.5,
              },
              centered: true,
            }}
          >
            <Notifications />
            <Component {...pageProps} />
          </ModalsProvider>
        </MantineProvider>
      </SWRConfig>
    </>
  );
}
