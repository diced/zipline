import { readEnv } from './read';
import { validateEnv, Config } from './validate';

let config: Config;

declare global {
  // eslint-disable-next-line no-var
  var __config__: Config;
}

if (!global.__config__) {
  global.__config__ = validateEnv(readEnv());
}

// eslint-disable-next-line prefer-const
config = global.__config__;

export { config };
