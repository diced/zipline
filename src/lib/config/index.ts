import { readFile } from 'fs/promises';
import { read } from './read';
import type { readDatabaseSettings } from './read/db';
import { validateConfigObject, Config } from './validate';
import { log } from '../logger';

type CachedConfig = {
  tos: string | null;
};

let config: Config;

declare global {
  var __config__: Config;
  var __tamperedConfig__: string[];

  var __cachedConfigValues__: Partial<CachedConfig>;
}

async function prepareSettings(settings?: Awaited<ReturnType<typeof readDatabaseSettings>>) {
  const { config: parsed, tampered } = await read(settings);
  const validated = validateConfigObject(parsed);
  const cachedValues: Partial<CachedConfig> = { tos: null };

  if (validated.website?.tos) {
    try {
      cachedValues.tos = await readFile(validated.website.tos, 'utf-8');
    } catch {
      log('config').error('failed to read tos', { path: validated.website.tos });
    }
  }

  return { config: validated, tampered, cachedValues };
}

function applySettings(settings: Awaited<ReturnType<typeof prepareSettings>>) {
  config = global.__config__ = settings.config;
  global.__tamperedConfig__ = settings.tampered;
  global.__cachedConfigValues__ = settings.cachedValues;
}

async function reloadSettings() {
  applySettings(await prepareSettings());
}

config = global.__config__;

export { applySettings, config, prepareSettings, reloadSettings };
