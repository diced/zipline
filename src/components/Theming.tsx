import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { CssBaseline } from '@material-ui/core';
import dark_blue from 'lib/themes/dark_blue';
import dark from 'lib/themes/dark';
import ayu_dark from 'lib/themes/ayu_dark';
import { useStoreSelector } from 'lib/redux/store';
import createTheme from 'lib/themes';

export const themes = {
  'dark_blue': dark_blue,
  'dark': dark,
  'ayu_dark': ayu_dark
};

export const friendlyThemeName = {
  'dark_blue': 'Dark Blue',
  'dark': 'Very Dark',
  'ayu_dark': 'Ayu Dark'
};

export default function ZiplineTheming({ Component, pageProps }) {
  let t;

  const user = useStoreSelector(state => state.user);
  if (!user) t = themes.dark_blue;
  else {
    if (user.customTheme) {
      t = createTheme({
        type: 'dark',
        primary: user.customTheme.primary,
        secondary: user.customTheme.secondary,
        error: user.customTheme.error,
        warning: user.customTheme.warning,
        info: user.customTheme.info,
        border: user.customTheme.border,
        background: {
          main: user.customTheme.mainBackground,
          paper: user.customTheme.paperBackground
        }
      });
    } else {
      t = themes[user.systemTheme] ?? themes.dark_blue;
    }
  }

  return (
    <ThemeProvider theme={t}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}