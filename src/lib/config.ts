import readConfig from './readConfig';
import validateConfig from '../server/validateConfig';

if (!global.config) global.config = validateConfig(readConfig());

export default global.config;