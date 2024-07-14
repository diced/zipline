import { config } from '../config';
import { log } from '../logger';
import { Datasource } from './Datasource';
import { LocalDatasource } from './Local';
import { S3Datasource } from './S3';

let datasource: Datasource;

declare global {
  // eslint-disable-next-line no-var
  var __datasource__: Datasource;
}

if (!global.__datasource__) {
  const logger = log('datasource');

  switch (config.datasource.type) {
    case 'local':
      global.__datasource__ = new LocalDatasource(config.datasource.local!.directory);
      break;
    case 's3':
      global.__datasource__ = new S3Datasource({
        accessKeyId: config.datasource.s3!.accessKeyId,
        secretAccessKey: config.datasource.s3!.secretAccessKey,
        region: config.datasource.s3?.region,
        bucket: config.datasource.s3!.bucket,
      });
      break;
    default:
      logger.error(`Datasource type ${config.datasource.type} is not supported`);
      process.exit(1);
  }
}

// eslint-disable-next-line prefer-const
datasource = global.__datasource__;

export { datasource };
