import React from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import darkdark from '../lib/themes/darkdark';
import bluedark from '../lib/themes/bluedark';
import purpledark from '../lib/themes/purpledark';
import light from '../lib/themes/light';

export const themes = {
  '': darkdark,
  'dark-dark': darkdark,
  'blue-dark': bluedark,
  'purple-dark': purpledark,
  light: light
};

export const friendlyThemeName = {
  'dark-dark': 'Very Dark',
  'blue-dark': 'Dark Blue',
  'purple-dark': 'Dark Purple',
  light: 'Explosive Light'
};

export default function ZiplineTheming({ Component, pageProps, theme }) {
  return (
    <ThemeProvider theme={themes[theme]}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
