import config from './config';
import { Openstack, Local, S3 } from './datasources';
import Logger from './logger';

if (!global.datasource) {
  switch (config.datasource.type) {
  case 's3':
    global.datasource = new S3(config.datasource.s3);
    Logger.get('datasource').info(`Using S3(${config.datasource.s3.bucket}) datasource`);
    break;
  case 'local':
    global.datasource = new Local(config.datasource.local.directory);
    Logger.get('datasource').info(`Using local(${config.datasource.local.directory}) datasource`);
    break;
  case 'openstack':
    global.datasource = new Openstack(config.datasource.openstack);
    Logger.get('datasource').info(
      `Using Openstack(${config.datasource.openstack.container}) datasource`
    );
    break;
  default:
    throw new Error('Invalid datasource type');
  }
}

export default global.datasource;