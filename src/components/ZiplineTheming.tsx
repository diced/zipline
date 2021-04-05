import React from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import darkdark from '../lib/themes/darkdark';
import bluedark from '../lib/themes/bluedark';
import light from '../lib/themes/light';
import { useState } from 'react';

export default function ZiplineTheming({ Component, pageProps, theme }) {
  const thm = {
    'dark-dark': darkdark,
    light: light,
    'blue-dark': bluedark,
    '': darkdark
  };

  return (
    <ThemeProvider theme={thm[theme]}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
