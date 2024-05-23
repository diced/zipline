import { AppProps } from 'next/app';
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
import 'mantine-datatable/styles.css';

import '@/lib/theme/override.css';
import '@/components/render/code/HighlightCode.theme.css';

const fetcher = async (url: RequestInfo | URL) => {
  const res = await fetch(url);

  if (!res.ok) {
    const json = await res.json();

    throw new Error(json.message);
  }

  return res.json();
};

export default function App({ Component, pageProps }: AppProps) {
  const themes: ZiplineTheme[] = pageProps.themes;

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
        <Theming themes={themes} defaultTheme={pageProps?.config?.website?.theme}>
          <ModalsProvider
            modalProps={{
              overlayProps: {
                blur: 3,
                opacity: 0.5,
              },
              centered: true,
            }}
          >
            <Notifications zIndex={100000000} />
            <Component {...pageProps} />
          </ModalsProvider>
        </Theming>
      </SWRConfig>
    </>
  );
}
