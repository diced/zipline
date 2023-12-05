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

export function colorHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).substr(-2);
  }

  return color;
}
