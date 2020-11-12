import React from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import dark from '../lib/themes/dark';
import light from '../lib/themes/light';

export default function ZiplineTheming({ Component, pageProps, theme }) {
  return (
    <ThemeProvider theme={theme == 'light' ? light : dark}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
