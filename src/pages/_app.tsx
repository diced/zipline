import { AppProps } from 'next/app';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import Head from 'next/head';
import { SWRConfig } from 'swr';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { ZiplineTheme } from '@/lib/theme';
import Theming from '@/components/ThemeProvider';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import 'mantine-datatable/styles.css';

import '@/styles/global.css';
import '@/styles/upload-animations.css';

import '@/components/render/code/HighlightCode.theme.scss';

const fetcher = async (url: RequestInfo | URL) => {
  const res = await fetch(url);

  if (!res.ok) {
    const json = await res.json();

    throw new Error(json.message);
  }

  return res.json();
};

export default function App({
  Component,
  pageProps,
}: AppProps & { Component: AppProps['Component'] & { title: string } }) {
  const themes: ZiplineTheme[] = pageProps.themes;

  return (
    <>
      <Head>
        <title>
          {`${pageProps?.config?.website?.title ?? 'Zipline'}${Component.title ? ` – ${Component.title}` : ''}`}
        </title>
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width' />
        <link rel='manifest' href='/manifest.json' />
      </Head>

      <SWRConfig
        value={{
          fetcher,
        }}
      >
        <Theming themes={themes} defaultTheme={pageProps?.config?.website?.theme}>
          <ModalsProvider
            modalProps={{
              overlayProps: {
                blur: 6,
              },
              centered: true,
            }}
          >
            <Notifications
              zIndex={100000000}
              position='top-right'
              style={{ marginTop: '70px', marginRight: '16px', opacity: 0.9 }}
            />
            <NuqsAdapter>
              <Component {...pageProps} />
            </NuqsAdapter>
          </ModalsProvider>
        </Theming>
      </SWRConfig>
    </>
  );
}
