import config from './config';
import { Datasource, Local, S3, Supabase } from './datasources';
import Logger from './logger';

const logger = Logger.get('datasource');

if (!global.datasource) {
  switch (config.datasource.type) {
    case 's3':
      global.datasource = new S3(config.datasource.s3);
      logger.info(`using S3(${config.datasource.s3.bucket}) datasource`);
      break;
    case 'local':
      global.datasource = new Local(config.datasource.local.directory);
      logger.info(`using Local(${config.datasource.local.directory}) datasource`);
      break;
    case 'supabase':
      global.datasource = new Supabase(config.datasource.supabase);
      logger.info(`using Supabase(${config.datasource.supabase.bucket}) datasource`);
      break;
    default:
      throw new Error('Invalid datasource type');
  }
}

export default global.datasource as Datasource;

declare global {
  var datasource: Datasource;
}
