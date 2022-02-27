import React from 'react';
import { Provider } from 'react-redux';
import Head from 'next/head';
import { useStore } from 'lib/redux/store';
import ZiplineTheming from 'components/Theming';

export default function MyApp({ Component, pageProps }) {
  const store = useStore();

  return (
    <Provider store={store}>
      <Head>
        <title>{Component.title}</title>
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width' />
      </Head>
      <ZiplineTheming Component={Component} pageProps={pageProps} />
    </Provider>
  );
}