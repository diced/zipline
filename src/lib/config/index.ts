import { readFile } from 'fs/promises';
import { read } from './read';
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

const reloadSettings = async () => {
  config = global.__config__ = validateConfigObject((await read()) as any);

  // Enable Turnstile if secret key is defined
  if (config.turnstile.secretKey) {
    config.turnstile.enabled = true;
  }

  if (!global.__cachedConfigValues__) {
    global.__cachedConfigValues__ = {};

    if (config.website.tos) {
      try {
        const tos = await readFile(config.website.tos, 'utf-8');
        global.__cachedConfigValues__.tos = tos;
      } catch {
        log('config').error('failed to read tos', { path: config.website.tos });
      }
    }
  }
};

config = global.__config__;

export { config, reloadSettings };
