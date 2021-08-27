import React from 'react';
import { Provider } from 'react-redux';
import PropTypes from 'prop-types';
import Head from 'next/head';
import Theming from 'components/Theming';
import { useStore } from 'lib/redux/store';

export default function MyApp({ Component, pageProps }) {
  const store = useStore();

  React.useEffect(() => {
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) jssStyles.parentElement.removeChild(jssStyles);
  }, []);

  return (
    <Provider store={store}>
      <Head>
        <title>{Component.title}</title>
        <meta name='description' content='Zipline' />
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width' />
      </Head>
      <Theming
        Component={Component}
        pageProps={pageProps}
      />
    </Provider>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};