import { read } from './read';
import { validateConfigObject, Config } from './validate';

let config: Config;

declare global {
  var __config__: Config;
  var __tamperedConfig__: string[];
}

const reloadSettings = async () => {
  config = global.__config__ = validateConfigObject((await read()) as any);
};

config = global.__config__;

export { config, reloadSettings };
