import { MantineTheme, darken as darkenFn, parseThemeColor } from '@mantine/core';

export function darken(color: string, alpha: number, theme: MantineTheme): string {
  return darkenFn(
    parseThemeColor({
      color,
      theme,
    }).value,
    alpha,
  );
}
