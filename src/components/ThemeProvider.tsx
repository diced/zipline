import { Response } from '@/lib/api/response';
import { Config } from '@/lib/config/validate';
import { useSettingsStore } from '@/lib/client/store/settings';
import { useUserStore } from '@/lib/client/store/user';
import { ZiplineTheme, findTheme, themeComponents } from '@/lib/theme';
import dark_blue from '@/lib/theme/builtins/dark_blue.theme.json' with { type: 'json' };
import { DAYJS_LOCALES } from '@/lib/i18n/languages';
import { currentLanguage } from '@/lib/i18n';
import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { useColorScheme } from '@mantine/hooks';
import { createContext, useContext } from 'react';
import useSWR from 'swr';
import { useShallow } from 'zustand/shallow';
import { useTranslation } from 'react-i18next';

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

export default function ThemeProvider({
  ssrThemes,
  ssrDefaultTheme,
  children,
}: {
  ssrThemes?: ZiplineTheme[];
  ssrDefaultTheme?: Config['website']['theme'];
  children: React.ReactNode;
}) {
  const { data: clientThemes } = useSWR<Response['/api/server/themes']>('/api/server/themes', {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    revalidateIfStale: false,
  });

  const themes = ssrThemes ?? clientThemes?.themes;
  const defaultTheme = ssrDefaultTheme ?? clientThemes?.defaultTheme;

  const user = useUserStore((state) => state.user);
  const [userTheme, preferredDark, preferredLight] = useSettingsStore(
    useShallow((state) => [state.settings.theme, state.settings.themeDark, state.settings.themeLight]),
  );
  const systemTheme = useColorScheme();
  const { i18n } = useTranslation();
  const dayjsLocale = i18n.resolvedLanguage ? DAYJS_LOCALES[currentLanguage()] : 'en';
  const currentTheme = user ? userTheme : (defaultTheme?.default ?? 'system');

  let theme = findTheme(currentTheme, themes);

  if (currentTheme === 'system') {
    theme =
      systemTheme === 'dark'
        ? (findTheme(user ? preferredDark : (defaultTheme?.dark ?? ''), themes) ??
          findTheme('builtin:dark_blue', themes))
        : (findTheme(user ? preferredLight : (defaultTheme?.light ?? ''), themes) ??
          findTheme('builtin:light_blue', themes));
  }

  if (!theme) {
    theme = findTheme('builtin:dark_blue') ?? (dark_blue as unknown as ZiplineTheme); // back up theme if all else fails lol
  }

  return (
    <>
      {theme?.extraCss && <style>{theme.extraCss}</style>}

      <ThemeContext.Provider value={{ themes: themes ?? [] }}>
        <MantineProvider
          defaultColorScheme={theme.colorScheme}
          forceColorScheme={theme.colorScheme}
          theme={createTheme({
            ...themeComponents(theme),
          })}
        >
          <DatesProvider settings={{ locale: dayjsLocale }}>{children}</DatesProvider>
        </MantineProvider>
      </ThemeContext.Provider>
    </>
  );
}
