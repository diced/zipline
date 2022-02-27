import React, { useEffect } from 'react';

// themes
import dark_blue from 'lib/themes/dark_blue';
import light_blue from 'lib/themes/light_blue';
import dark from 'lib/themes/dark';
import ayu_dark from 'lib/themes/ayu_dark';
import ayu_mirage from 'lib/themes/ayu_mirage';
import ayu_light from 'lib/themes/ayu_light';
import nord from 'lib/themes/nord';
import dracula from 'lib/themes/dracula';
import matcha_dark_azul from 'lib/themes/matcha_dark_azul';
import qogir_dark from 'lib/themes/qogir_dark';

import { useStoreSelector } from 'lib/redux/store';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { NotificationsProvider } from '@mantine/notifications';
import { useColorScheme } from '@mantine/hooks';

export const themes = {
  system: (colorScheme: 'dark' | 'light') => colorScheme === 'dark' ? dark_blue : light_blue,
  dark_blue,
  light_blue,
  dark,
  ayu_dark,
  ayu_mirage,
  ayu_light,
  nord,
  dracula,
  matcha_dark_azul,
  qogir_dark,
};

export const friendlyThemeName = {
  'system': 'System Theme',
  'dark_blue': 'Dark Blue',
  'light_blue': 'Light Blue',
  'dark': 'Very Dark',
  'ayu_dark': 'Ayu Dark',
  'ayu_mirage': 'Ayu Mirage',
  'ayu_light': 'Ayu Light',
  'nord': 'Nord',
  'dracula': 'Dracula',
  'matcha_dark_azul': 'Matcha Dark Azul',
  'qogir_dark': 'Qogir Dark',
};

export default function ZiplineTheming({ Component, pageProps, ...props }) {
  const user = useStoreSelector(state => state.user);
  const colorScheme = useColorScheme();

  let theme: MantineThemeOverride;

  if (!user) theme = themes.system(colorScheme);
  else if (user.systemTheme === 'system') theme = themes.system(colorScheme);
  else theme = themes[user.systemTheme] ?? themes.system(colorScheme);

  useEffect(() => {
    document.documentElement.style.setProperty('color-scheme', theme.colorScheme);
  }, [user, theme]);

  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={theme}
      styles={{
        AppShell: t => ({
          root: {
            backgroundColor: t.other.AppShell_backgroundColor,
          },
        }),
        Popover: {
          inner: {
            width: 200,
          },
        },
        Accordion: {
          itemTitle: {
            border: 0,
          },
          itemOpened: {
            border: 0,
          },
        },
      }}
    >
      <ModalsProvider>
        <NotificationsProvider>
          {props.children ? props.children : <Component {...pageProps} />}
        </NotificationsProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}