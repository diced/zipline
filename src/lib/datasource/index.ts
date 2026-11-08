import { isMainThread } from 'worker_threads';
import { Config } from '../config/validate';
import { log } from '../logger';
import { Datasource } from './Datasource';
import { LocalDatasource } from './Local';
import { S3Datasource } from './S3';

let datasource: Datasource;

declare global {
  var __datasource__: Datasource;
}

function getDatasource(config?: Config): Datasource | void {
  if (!config) return;

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
        endpoint: config.datasource.s3?.endpoint,
        forcePathStyle: config.datasource.s3?.forcePathStyle,
        subdirectory: config.datasource.s3?.subdirectory,
      });
      break;
    default:
      logger.error(`Datasource type ${config.datasource.type} is not supported`);
      process.exit(1);
  }

  return datasource;
}

datasource = global.__datasource__;

// Don't instantiate datasource if we are not in the main thread since they handle their own initialization
if (!global.__datasource__ && !datasource && isMainThread) {
  import('../config/index.js')
    .then(({ config }) => {
      if (!global.__datasource__) getDatasource(config);
    })
    .catch((error) => {
      console.error('Failed to initialize datasource:', error);
      process.exit(1);
    });
}

export { datasource, getDatasource };
