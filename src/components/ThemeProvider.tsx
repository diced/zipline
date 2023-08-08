import { useSettingsStore } from '@/lib/store/settings';
import { ZiplineTheme, themeComponents } from '@/lib/theme';
import { MantineProvider } from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext<{
  themes: ZiplineTheme[];
}>({
  themes: [],
});

export function useThemes() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemes must be used within a ThemeProvider');

  return ctx.themes;
}

export default function Theming({ themes, children }: { themes: ZiplineTheme[]; children: React.ReactNode }) {
  const [currentTheme, preferredDark, preferredLight] = useSettingsStore((state) => [
    state.settings.theme,
    state.settings.themeDark,
    state.settings.themeLight,
  ]);
  const systemTheme = useColorScheme();

  let theme = themes.find((theme) => theme.id === currentTheme);
  if (currentTheme === 'system') {
    theme =
      systemTheme === 'dark'
        ? themes.find((theme) => theme.id === preferredDark)
        : themes.find((theme) => theme.id === preferredLight);
  }

  if (!theme) {
    theme =
      themes.find((theme) => theme.id === 'builtin:dark_gray') ??
      ({
        id: 'builtin:dark_gray',
        name: 'Dark Gray',
        colorScheme: 'dark',
        primaryColor: 'gray',
      } as ZiplineTheme); // back up theme if all else fails lol
  }

  return (
    <ThemeContext.Provider value={{ themes }}>
      <MantineProvider withGlobalStyles withNormalizeCSS withCSSVariables theme={themeComponents(theme)}>
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
