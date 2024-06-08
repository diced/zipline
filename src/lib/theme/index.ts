import { AppShell, LoadingOverlay, MantineTheme, MantineThemeOverride, Modal } from '@mantine/core';

export type ZiplineTheme = MantineTheme & {
  id: string;
  name: string;
  colorScheme: string;
  mainBackgroundColor: string;
};

export function findTheme(id: string, themes: ZiplineTheme[] = []): ZiplineTheme | undefined {
  return themes.find((theme) => theme.id === id);
}

export function themeComponents(theme: ZiplineTheme): MantineThemeOverride {
  return {
    ...theme,
    components: {
      AppShell: AppShell.extend({
        styles: {
          main: {
            backgroundColor: theme.mainBackgroundColor,
          },
        },
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
