import config from './config';
import { S3, Local } from './datasource';
import Logger from './logger';

if (!global.datasource) {
  switch (config.datasource.type) {
  case 's3':
    Logger.get('datasource').info(`Using S3(${config.datasource.s3.bucket}) datasource`);
    global.datasource = new S3(config.datasource.s3.access_key_id, config.datasource.s3.secret_access_key, config.datasource.s3.bucket);
    break;
  case 'local':
    Logger.get('datasource').info(`Using local(${config.datasource.local.directory}) datasource`);
    global.datasource = new Local(config.datasource.local.directory);
    break;
  default:
    throw new Error('Invalid datasource type');
  }
}

export default global.datasource;