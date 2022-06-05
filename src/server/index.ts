import { version } from '../../package.json';
import Logger from '../lib/logger';

Logger.get('server').info(`starting zipline@${version} server`);

import Server from './server';
new Server();