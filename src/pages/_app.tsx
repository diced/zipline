import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';
import ZiplineTheming from '../components/ZiplineTheming';
import UIPlaceholder from '../components/UIPlaceholder';

function MyApp({ Component, pageProps }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) jssStyles.parentElement.removeChild(jssStyles);

    (async () => {
      const d = await (await fetch('/api/theme')).json();
      if (!d.error) setTheme(d.theme);
    })();
  }, []);
  return (
    <React.Fragment>
      <Head>
        <title>Zipline</title>
        <meta
          name='viewport'
          content='minimum-scale=1, initial-scale=1, width=device-width'
        />
      </Head>

      <Provider store={store}>
        <PersistGate loading={<UIPlaceholder />} persistor={persistor}>
          <ZiplineTheming
            Component={Component}
            pageProps={pageProps}
            theme={theme}
          />
        </PersistGate>
      </Provider>
    </React.Fragment>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired
};

export default MyApp;
