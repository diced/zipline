import config from './config';
import { S3, Local } from './datasource';
import Logger from './logger';

if (!global.datasource) {
  switch (config.datasource.type) {
  case 's3':
    global.datasource = new S3(config.datasource.s3.access_key_id, config.datasource.s3.secret_access_key, config.datasource.s3.bucket);
    Logger.get('datasource').info(`Using S3:${config.datasource.s3.bucket} datasource`);
    break;
  case 'local':
    global.datasource = new Local(config.datasource.local.directory);
    Logger.get('datasource').info(`Using local:${config.datasource.local.directory} datasource`);
    break;
  default:
    throw new Error('Invalid datasource type');
  }
};

export default global.datasource;