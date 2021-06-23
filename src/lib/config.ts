import type { Config } from './types';
import readConfig from './readConfig';

if (!global.config) global.config = readConfig() as Config;

export default global.config;