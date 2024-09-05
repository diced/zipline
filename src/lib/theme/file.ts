import { readFile, readdir } from 'fs/promises';
import { basename, join } from 'path';
import { ZiplineTheme } from '.';
import { exists } from '../fs';

import dark_gray from './builtins/dark_gray.theme.json';
import light_gray from './builtins/light_gray.theme.json';
import { log } from '../logger';

const THEMES_DIR = './themes';
const logger = log('theme');

export async function readThemes(includeBuiltins: boolean = true): Promise<ZiplineTheme[]> {
  const themes = await readThemesDir();
  const parsedThemes = await parseThemes(themes);

  for (let i = 0; i !== parsedThemes.length; ++i) {
    const theme = parsedThemes[i];
    if (!theme.mainBackgroundColor) {
      logger.error(`Theme ${theme.id} is missing mainBackgroundColor property, using a default value.`);

      theme.mainBackgroundColor =
        theme.colorScheme === 'light'
          ? 'color-mix(in srgb, var(--mantine-color-white), black 3%)' // darken(white 3%)
          : 'color-mix(in srgb, var(--mantine-color-gray-9), black 45%)'; // darken(--mantine-color-gray-9 45%)
    }

    parsedThemes[i] = await handleOverrideColors(parsedThemes[i]);
  }

  if (includeBuiltins) {
    parsedThemes.push(
      await handleOverrideColors(dark_gray as ZiplineTheme),
      await handleOverrideColors(light_gray as ZiplineTheme),
    );
  }

  return parsedThemes;
}

export async function readThemesDir(): Promise<string[]> {
  const absDir = join(process.cwd(), THEMES_DIR);
  if (!(await exists(absDir))) return [];

  const files = await readdir(absDir);
  const themes = files.filter((file) => file.endsWith('.theme.json')).map((file) => join(absDir, file));

  return themes;
}

export async function parseThemes(themes: string[]): Promise<ZiplineTheme[]> {
  const parsedThemes = [];

  for (const theme of themes) {
    const themeData: any = await readFile(theme, 'utf-8');
    const themeS = JSON.parse(themeData);
    themeS.id = basename(theme, '.theme.json');

    parsedThemes.push(themeS);
  }

  return parsedThemes;
}

export async function handleOverrideColors(theme: ZiplineTheme) {
  return {
    ...theme,
    colors: {
      ...theme.colors,
      google: theme.colors?.google || Array(10).fill('#4285F4'),
      github: theme.colors?.github || Array(10).fill('#24292E'),
      oidc: theme.colors?.oidc || Array(10).fill('#72abcf'),
      discord: theme.colors?.discord || Array(10).fill('#5865F2'),
    },
  } as ZiplineTheme;
}
