import { config } from '../config';
import { log } from '../logger';
import { Datasource } from './Datasource';
import { LocalDatasource } from './Local';
import { S3Datasource } from './S3';
import { WebDAVDatasource } from './WebDAV';
import { SMBDatasource } from './SMB';
import { prisma } from '../db';

let datasource: Datasource;

declare global {
  // eslint-disable-next-line no-var
  var __datasource__: Datasource;
}

async function getDatasource(conf?: typeof config): Promise<void> {
  if (!conf) return;

  const logger = log('datasource');

  try {
    const settings = await prisma.zipline.findFirst();

    if (settings?.filesMountEnabled && settings.filesMountType === 'webdav') {
      logger.info('using webdav datasource from database settings');

      if (!settings.filesMountHost) {
        logger.error('WebDAV mount enabled but no host configured');
        process.exit(1);
      }

      datasource = global.__datasource__ = new WebDAVDatasource({
        url: settings.filesMountHost,
        username: settings.filesMountUsername || undefined,
        password: settings.filesMountPassword || undefined,
      });
      return;
    }

    if (settings?.filesMountEnabled && settings.filesMountType === 'smb') {
      logger.info('using smb datasource from database settings');

      if (!settings.filesMountHost) {
        logger.error('SMB mount enabled but no host configured');
        process.exit(1);
      }

      const parts = settings.filesMountHost.split('/');
      const host = parts[0];
      const share = parts[1] || 'share';
      const basePath = parts.slice(2).join('/');

      const domain = settings.filesMountDomain || 'WORKGROUP';

      logger.info('parsed smb configuration', { host, share, basePath, domain });

      datasource = global.__datasource__ = new SMBDatasource({
        host: host,
        share: share,
        basePath: basePath || undefined,
        username: settings.filesMountUsername || undefined,
        password: settings.filesMountPassword || undefined,
        domain: domain,
      });
      return;
    }
  } catch (error: any) {
    logger.warn('failed to check database mount settings, falling back to config', { error: error.message });
  }

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
}

datasource = global.__datasource__;

if (!global.__datasource__ && !datasource) {
  getDatasource(config).catch((error) => {
    log('datasource').error('failed to initialize datasource', { error: error.message });
    process.exit(1);
  });
}

export { datasource, getDatasource };
