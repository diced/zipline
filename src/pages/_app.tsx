import { QueryClientProvider } from '@tanstack/react-query';
import ZiplineTheming from 'components/Theming';
import queryClient from 'lib/queries/client';
import Head from 'next/head';
import { RecoilRoot } from 'recoil';

export default function MyApp({ Component, pageProps }) {
  return (
    <RecoilRoot>
      <Head>
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width' />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ZiplineTheming Component={Component} pageProps={pageProps} />
      </QueryClientProvider>
    </RecoilRoot>
  );
}
