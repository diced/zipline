import { read } from './read';
import { validateConfigObject, Config } from './validate';

let config: Config;

declare global {
  // eslint-disable-next-line no-var
  var __config__: Config;
}

const reloadSettings = async () => {
  config = global.__config__ = validateConfigObject((await read()) as any);
};

config = global.__config__;

export { config, reloadSettings };
