import React from 'react';
import { Provider } from 'react-redux';
import Head from 'next/head';
import { store } from 'lib/redux/store';
import ZiplineTheming from 'components/Theming';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from 'lib/queries/client';

export default function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <Head>
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width' />
      </Head>
      <QueryClientProvider
        client={queryClient}
      >
        <ZiplineTheming Component={Component} pageProps={pageProps} />
      </QueryClientProvider>
    </Provider>
  );
}