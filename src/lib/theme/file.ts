import { readFile, readdir } from 'fs/promises';
import { basename, join } from 'path';
import { ZiplineTheme } from '.';
import { exists } from '../fs';

import dark_gray from './builtins/dark_gray.theme.json';
import light_gray from './builtins/light_gray.theme.json';

const THEMES_DIR = './themes';

export async function readThemes(includeBuiltins: boolean = true): Promise<ZiplineTheme[]> {
  const themes = await readThemesDir();
  const parsedThemes = await parseThemes(themes);

  for (let i = 0; i !== parsedThemes.length; ++i) {
    parsedThemes[i] = await handleOverrideColors(parsedThemes[i]);
  }

  if (includeBuiltins) {
    parsedThemes.push(
      await handleOverrideColors(dark_gray as ZiplineTheme),
      await handleOverrideColors(light_gray as ZiplineTheme)
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
      google: theme.colors?.google || ['#4285F4'],
      github: theme.colors?.github || ['#24292E'],
      authentik: theme.colors?.authentik || ['#FD4B2D'],
      discord: theme.colors?.discord || ['#5865F2'],
    },
  } as ZiplineTheme;
}
