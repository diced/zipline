import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import CssBaseline from '@material-ui/core/CssBaseline';
import UIPlaceholder from '../components/UIPlaceholder';
import { ThemeProvider } from '@material-ui/core/styles';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../lib/store';
import theme from '../lib/theme';

export default function MyApp(props) {
  const { Component, pageProps } = props;
  useEffect(() => {
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
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
