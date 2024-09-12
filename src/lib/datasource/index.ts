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

function getDatasource(conf?: typeof config): void {
  if (!conf) return;

  const logger = log('datasource');

  switch (config.datasource.type) {
    case 'local':
      datasource = global.__datasource__ = new LocalDatasource(config.datasource.local!.directory);
      break;
    case 's3':
      datasource = global.__datasource__ = new S3Datasource({
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

if (!global.__datasource__ && !datasource) {
  getDatasource(config);
}

export { datasource, getDatasource };
