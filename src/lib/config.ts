import { Config } from 'config/Config';
import readConfig from 'config/readConfig';
import validateConfig from 'config/validateConfig';

if (!global.config) global.config = validateConfig(readConfig());

export default global.config as Config;

declare global {
  // eslint-disable-next-line no-var
  var config: Config;
}
