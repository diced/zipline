import React from 'react';
import { Provider } from 'react-redux';
import Head from 'next/head';
import { store } from 'lib/redux/store';
import ZiplineTheming from 'components/Theming';

export default function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <Head>
        <title>{Component.title}</title>
      </Head>
      <ZiplineTheming Component={Component} pageProps={pageProps} />
    </Provider>
  );
}