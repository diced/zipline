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

import { createEmotionCache, MantineProvider, MantineThemeOverride, Modal, ScrollArea } from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { SpotlightProvider } from '@mantine/spotlight';
import { Notifications } from '@mantine/notifications';
import { userSelector } from 'lib/recoil/user';
import { useRecoilValue } from 'recoil';
import { SearchIcon } from './icons';

import { useRouter } from 'next/router';
import { createSpotlightActions } from 'lib/spotlight';

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

const cache = createEmotionCache({ key: 'zipline' });

export default function ZiplineTheming({ Component, pageProps, ...props }) {
  const user = useRecoilValue(userSelector);
  const colorScheme = useColorScheme();
  const router = useRouter();

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
      emotionCache={cache}
      theme={{
        ...theme,
        fontFamily: 'Ubuntu, sans-serif',
        fontFamilyMonospace: 'Ubuntu Mono, monospace',
        headings: {
          fontFamily: 'Ubuntu, sans-serif',
        },
        components: {
          AppShell: {
            styles: (t) => ({
              main: {
                backgroundColor: t.other.AppShell_backgroundColor,
                // backgroundColor: '#fff',
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
              transitionProps: {
                exitDuration: 100,
              },
              overlayProps: {
                blur: 6,
                color: theme.colorScheme === 'dark' ? theme.colors.dark[6] : 'white',
              },
              // scrollAreaComponent: Modal.NativeScrollArea,
            },
          },
          Popover: {
            defaultProps: {
              transition: 'pop',
              shadow: 'lg',
            },
          },
          LoadingOverlay: {
            defaultProps: {
              overlayProps: {
                blur: 3,
                color: theme.colorScheme === 'dark' ? theme.colors.dark[6] : 'white',
              },
            },
          },
          Loader: {
            defaultProps: {
              variant: 'dots',
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
        <SpotlightProvider
          searchIcon={<SearchIcon />}
          shortcut={['mod + k', '/']}
          actions={createSpotlightActions(router)}
        >
          <Notifications position='top-center' style={{ marginTop: -10 }} />
          {props.children ? props.children : <Component {...pageProps} />}
        </SpotlightProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
