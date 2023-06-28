import { readEnv } from './read';
import { validateEnv, Config } from './validate';

let config: Config;

declare global {
  var __config__: Config;
}

if (!global.__config__) {
  global.__config__ = validateEnv(readEnv());
}

config = global.__config__;

export { config };
