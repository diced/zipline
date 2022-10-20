import { useEffect } from 'react';

// themes
import ayu_dark from 'lib/themes/ayu_dark';
import ayu_light from 'lib/themes/ayu_light';
import ayu_mirage from 'lib/themes/ayu_mirage';
import dark from 'lib/themes/dark';
import dark_blue from 'lib/themes/dark_blue';
import dracula from 'lib/themes/dracula';
import light_blue from 'lib/themes/light_blue';
import matcha_dark_azul from 'lib/themes/matcha_dark_azul';
import nord from 'lib/themes/nord';
import qogir_dark from 'lib/themes/qogir_dark';

import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { NotificationsProvider } from '@mantine/notifications';
import { useRecoilValue } from 'recoil';
import { userSelector } from 'lib/recoil/user';

export const themes = {
  system: (colorScheme: 'dark' | 'light') => (colorScheme === 'dark' ? dark_blue : light_blue),
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
  system: 'System Theme',
  dark_blue: 'Dark Blue',
  light_blue: 'Light Blue',
  dark: 'Very Dark',
  ayu_dark: 'Ayu Dark',
  ayu_mirage: 'Ayu Mirage',
  ayu_light: 'Ayu Light',
  nord: 'Nord',
  dracula: 'Dracula',
  matcha_dark_azul: 'Matcha Dark Azul',
  qogir_dark: 'Qogir Dark',
};

export default function ZiplineTheming({ Component, pageProps, ...props }) {
  const user = useRecoilValue(userSelector);
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
      theme={{
        ...theme,
        components: {
          AppShell: {
            styles: (t) => ({
              root: {
                backgroundColor: t.other.AppShell_backgroundColor,
              },
            }),
          },
          NavLink: {
            styles: (t) => ({
              icon: {
                paddingLeft: t.spacing.sm,
              },
            }),
          },
          Modal: {
            defaultProps: {
              centered: true,
              overlayBlur: 3,
              overlayColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : 'white',
            },
          },
          Popover: {
            defaultProps: {
              transition: 'pop',
            },
          },
          LoadingOverlay: {
            defaultProps: {
              overlayBlur: 3,
              overlayColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : 'white',
            },
          },
          Card: {
            styles: (t) => ({
              root: {
                backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[6] : t.colors.gray[0],
              },
            }),
          },
          Image: {
            styles: (t) => ({
              placeholder: {
                backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[6] : t.colors.gray[0],
              },
            }),
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
