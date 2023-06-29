import { config } from '../config';
import { log } from '../logger';
import { Datasource } from './Datasource';
import { LocalDatasource } from './Local';

let datasource: Datasource;

declare global {
  var __datasource__: Datasource;
}

if (!global.__datasource__) {
  const logger = log('datasource');

  switch (config.datasource.type) {
    case 'local':
      global.__datasource__ = new LocalDatasource(config.datasource.local!.directory);
      break;
    case 's3':
    default:
      logger.error(`Datasource type ${config.datasource.type} is not supported`);
      process.exit(1);
  }
}

datasource = global.__datasource__;

export { datasource };
