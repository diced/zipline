import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import CssBaseline from '@material-ui/core/CssBaseline';
import UIPlaceholder from '../components/UIPlaceholder';
import { ThemeProvider } from '@material-ui/core/styles';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../lib/store';
import theme from '../lib/themes/dark';
import { ConfigMeta } from '../lib/Config';

export default function MyApp(props) {
  const { Component, pageProps } = props;
  const [metas, setMetas] = useState<ConfigMeta>(null);

  useEffect(() => {
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
    (async () => {
      const d = await (await fetch('/api/config/meta')).json();
      if (!d.error) setMetas(d);
    })();
  }, []);

  return (
    <React.Fragment>
      <Provider store={store}>
        <PersistGate loading={<UIPlaceholder />} persistor={persistor}>
          <Head>
            <title>Zipline</title>
            <meta
              name='viewport'
              content='minimum-scale=1, initial-scale=1, width=device-width'
            />
          </Head>
          {metas ? (
            <Head>
              <meta name='theme-color' content={metas.color} />
              <meta name='title' content={metas.title} />
              <meta name='description' content={metas.description} />
              <meta property='og:title' content={metas.title} />
              <meta property='og:thumbnail' content={metas.thumbnail} />
            </Head>
          ) : null}
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Component {...pageProps} />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </React.Fragment>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};
