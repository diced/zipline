import { AppShell, LoadingOverlay, MantineTheme, MantineThemeOverride, Modal } from '@mantine/core';

export type ZiplineTheme = MantineTheme & { id: string; name: string; colorScheme: string };

export function findTheme(id: string, themes: ZiplineTheme[] = []): ZiplineTheme | undefined {
  return themes.find((theme) => theme.id === id);
}

export function themeComponents(theme: ZiplineTheme): MantineThemeOverride {
  return {
    ...theme,
    components: {
      AppShell: AppShell.extend({
        styles: (t) => ({
          main: {
            background: `${theme.colorScheme === 'dark' ? t.colors.dark[8] : t.colors.gray[0]} !important`,
          },
        }),
      }),
      LoadingOverlay: LoadingOverlay.extend({
        defaultProps: {
          overlayProps: {
            opacity: 0.3,
          },
        },
      }),
      Modal: Modal.extend({
        defaultProps: {
          closeButtonProps: { size: 'lg' },
          centered: true,
          overlayProps: {
            blur: 6,
          },
        },
      }),
    },
  };
}
