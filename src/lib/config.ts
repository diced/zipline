import type { Config } from './types';
import readConfig from './readConfig';
import validateConfig from '../../server/validateConfig';

if (!global.config)  global.config = validateConfig(readConfig()) as unknown as Config;

export default global.config;