import config from './config';
import { Swift, Local, S3, Datasource } from './datasources';
import Logger from './logger';

if (!global.datasource) {
  switch (config.datasource.type) {
    case 's3':
      global.datasource = new S3(config.datasource.s3);
      Logger.get('datasource').info(`using S3(${config.datasource.s3.bucket}) datasource`);
      break;
    case 'local':
      global.datasource = new Local(config.datasource.local.directory);
      Logger.get('datasource').info(`using Local(${config.datasource.local.directory}) datasource`);
      break;
    case 'swift':
      global.datasource = new Swift(config.datasource.swift);
      Logger.get('datasource').info(`using Swift(${config.datasource.swift.container}) datasource`);
      break;
    default:
      throw new Error('Invalid datasource type');
  }
}

export default global.datasource as Datasource;
