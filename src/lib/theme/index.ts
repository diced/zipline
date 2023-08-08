import { MantineTheme, MantineThemeOverride, rem } from '@mantine/core';

export type ZiplineTheme = MantineTheme & { id: string; name: string };

export function findTheme(id: string, themes: ZiplineTheme[] = []): ZiplineTheme | undefined {
  return themes.find((theme) => theme.id === id);
}

export function themeComponents(theme: ZiplineTheme): MantineThemeOverride {
  return {
    ...theme,
    components: {
      Paper: {
        styles: (theme) => ({
          root: {
            '&[data-with-border]': {
              border: `${rem(1)} solid ${
                theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]
              }`,
            },
          },
        }),
      },
      AppShell: {
        styles: (theme) => ({
          main: {
            background: `${
              theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0]
            } !important`,
          },
        }),
      },
      LoadingOverlay: {
        defaultProps: {
          // overlayColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : 'white',
          overlayOpacity: 0.3,
        },
      },
      Modal: {
        defaultProps: {
          closeButtonProps: { size: 'lg' },
          centered: true,
          overlayProps: {
            blur: 6,
          },
        },
      },
    },
  };
}
