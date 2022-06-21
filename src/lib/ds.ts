import config from './config';
import { Openstack, Local, S3 } from './datasource';
import Logger from './logger';

if (!global.datasource) {
  switch (config.datasource.type) {
  case 's3':
    Logger.get('datasource').info(
      `Using S3(${config.datasource.s3.bucket}) datasource`
    );
    global.datasource = new S3(config.datasource.s3);
    break;
  case 'local':
    Logger.get('datasource').info(
      `Using local(${config.datasource.local.directory}) datasource`
    );
    global.datasource = new Local(config.datasource.local.directory);
    break;
  case 'openstack':
    Logger.get('datasource').info(
      `Using Openstack(${config.datasource.openstack.container}) datasource`
    );
    global.datasource = new Openstack(config.datasource.openstack);
    break;
  default:
    throw new Error('Invalid datasource type');
  }
}

export default global.datasource;