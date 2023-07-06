import bytes from 'bytes';
import msFn from 'ms';
import { log } from '../logger';

type EnvType = 'string' | 'string[]' | 'number' | 'boolean' | 'byte' | 'ms' | 'json[]';

export type ParsedEnv = ReturnType<typeof readEnv>;

export const PROP_TO_ENV: Record<string, string> = {
  'core.port': 'CORE_PORT',
  'core.hostname': 'CORE_HOSTNAME',
  'core.secret': 'CORE_SECRET',
  'core.databaseUrl': 'CORE_DATABASE_URL',
  'core.returnHttpsUrls': 'CORE_RETURN_HTTPS_URLS',

  'files.route': 'FILES_ROUTE',
  'files.length': 'FILES_LENGTH',
  'files.defaultFormat': 'FILES_DEFAULT_FORMAT',
  'files.disabledExtensions': 'FILES_DISABLED_EXTENSIONS',
  'files.maxFileSize': 'FILES_MAX_FILE_SIZE',
  'files.defaultExpiration': 'FILES_DEFAULT_EXPIRATION',
  'files.assumeMimetypes': 'FILES_ASSUME_MIMETYPES',
  'files.defaultDateFormat': 'FILES_DEFAULT_DATE_FORMAT',

  'datasource.type': 'DATASOURCE_TYPE',

  // only for errors, not used in readenv
  'datasource.s3': 'DATASOURCE_S3_*',
  'datasource.local': 'DATASOURCE_LOCAL_*',

  'datasource.s3.accessKeyId': 'DATASOURCE_S3_ACCESS_KEY_ID',
  'datasource.s3.secretAccessKey': 'DATASOURCE_S3_SECRET_ACCESS_KEY',
  'datasource.s3.region': 'DATASOURCE_S3_REGION',
  'datasource.s3.bucket': 'DATASOURCE_S3_BUCKET',

  'datasource.local.directory': 'DATASOURCE_LOCAL_DIRECTORY',

  'features.thumbnail': 'FEATURES_THUMBNAIL',
  'features.imageCompression': 'FEATURES_IMAGE_COMPRESSION',
  'features.robotsTxt': 'FEATURES_ROBOTS_TXT',
  'features.healthcheck': 'FEATURES_HEALTHCHECK',
  'features.invites': 'FEATURES_INVITES',
  'features.userRegistration': 'FEATURES_USER_REGISTRATION',
  'features.oauthRegistration': 'FEATURES_OAUTH_REGISTRATION',

  'website.title': 'WEBSITE_TITLE',
  'website.externalLinks': 'WEBSITE_EXTERNAL_LINKS',
  'website.defaultAvatar': 'WEBSITE_DEFAULT_AVATAR',
  'website.disableMediaPreview': 'WEBSITE_DISABLE_MEDIA_PREVIEW',
};

const logger = log('config').c('read');

export function readEnv() {
  const envs = [
    env(PROP_TO_ENV['core.port'], 'core.port', 'number'),
    env(PROP_TO_ENV['core.hostname'], 'core.hostname', 'string'),
    env(PROP_TO_ENV['core.secret'], 'core.secret', 'string'),
    env(PROP_TO_ENV['core.databaseUrl'], 'core.databaseUrl', 'string'),

    env(PROP_TO_ENV['files.route'], 'files.route', 'string'),
    env(PROP_TO_ENV['files.length'], 'files.length', 'number'),
    env(PROP_TO_ENV['files.defaultFormat'], 'files.defaultFormat', 'string'),
    env(PROP_TO_ENV['files.disabledExtensions'], 'files.disabledExtensions', 'string[]'),
    env(PROP_TO_ENV['files.maxFileSize'], 'files.maxFileSize', 'byte'),
    env(PROP_TO_ENV['files.defaultExpiration'], 'files.defaultExpiration', 'ms'),

    env(PROP_TO_ENV['datasource.type'], 'datasource.type', 'string'),

    env(PROP_TO_ENV['datasource.s3.accessKeyId'], 'datasource.s3.accessKeyId', 'string'),
    env(PROP_TO_ENV['datasource.s3.secretAccessKey'], 'datasource.s3.secretAccessKey', 'string'),
    env(PROP_TO_ENV['datasource.s3.region'], 'datasource.s3.region', 'string'),
    env(PROP_TO_ENV['datasource.s3.bucket'], 'datasource.s3.bucket', 'string'),

    env(PROP_TO_ENV['datasource.local.directory'], 'datasource.local.directory', 'string'),

    env(PROP_TO_ENV['features.thumbnail'], 'features.thumbnail', 'boolean'),
    env(PROP_TO_ENV['features.imageCompression'], 'features.imageCompression', 'boolean'),
    env(PROP_TO_ENV['features.robotsTxt'], 'features.robotsTxt', 'boolean'),
    env(PROP_TO_ENV['features.healthcheck'], 'features.healthcheck', 'boolean'),
    env(PROP_TO_ENV['features.invites'], 'features.invites', 'boolean'),
    env(PROP_TO_ENV['features.userRegistration'], 'features.userRegistration', 'boolean'),
    env(PROP_TO_ENV['features.oauthRegistration'], 'features.oauthRegistration', 'boolean'),

    env(PROP_TO_ENV['website.title'], 'website.title', 'string'),
    env(PROP_TO_ENV['website.externalLinks'], 'website.externalLinks', 'json[]'),
    env(PROP_TO_ENV['website.defaultAvatar'], 'website.defaultAvatar', 'string'),
    env(PROP_TO_ENV['website.disableMediaPreview'], 'website.disableMediaPreview', 'boolean'),
  ];

  const raw: any = {
    core: {
      port: undefined,
      hostname: undefined,
      secret: undefined,
      databaseUrl: undefined,
      returnHttpsUrls: undefined,
    },
    files: {
      route: undefined,
      length: undefined,
      defaultFormat: undefined,
      disabledExtensions: undefined,
      maxFileSize: undefined,
      defaultExpiration: undefined,
      assumeMimetypes: undefined,
      defaultDateFormat: undefined,
    },
    datasource: {
      type: undefined,
    },
    features: {
      thumbnail: undefined,
      imageCompression: undefined,
      robotsTxt: undefined,
      healthcheck: undefined,
      invites: undefined,
      userRegistration: undefined,
      oauthRegistration: undefined,
    },
    website: {
      title: undefined,
      externalLinks: undefined,
      defaultAvatar: undefined,
      disableMediaPreview: undefined,
    },
  };

  for (let i = 0; i !== envs.length; ++i) {
    const env = envs[i];
    const value = process.env[env.variable];
    if (value === undefined) continue;

    if (env.variable === 'DATASOURCE_TYPE') {
      if (value === 's3') {
        raw.datasource.s3 = {
          accessKeyId: undefined,
          secretAccessKey: undefined,
          region: undefined,
          bucket: undefined,
        };
      } else if (value === 'local') {
        raw.datasource.local = {
          directory: undefined,
        };
      }
    }

    const parsed = parse(value, env.type);
    if (parsed === undefined) continue;

    setDotProp(raw, env.property, parsed);
  }

  return raw;
}

function env(variable: string, property: string, type: EnvType) {
  return {
    variable,
    property,
    type,
  };
}

function setDotProp(obj: Record<string, any>, property: string, value: unknown) {
  const parts = property.split('.');
  const last = parts.pop()!;

  for (let i = 0; i !== parts.length; ++i) {
    const part = parts[i];
    const next = obj[part];

    if (typeof next === 'object' && next !== null) {
      obj = next;
    } else {
      obj = obj[part] = {};
    }
  }

  obj[last] = value;
}

function parse(value: string, type: EnvType) {
  switch (type) {
    case 'string':
      return string(value);
    case 'string[]':
      return value
        .split(',')
        .filter((s) => s.length !== 0)
        .map((s) => s.trim());
    case 'number':
      return number(value);
    case 'boolean':
      return boolean(value);
    case 'byte':
      return byte(value);
    case 'ms':
      return ms(value);
    case 'json[]':
      try {
        return JSON.parse(value);
      } catch {
        logger.error(`Failed to parse JSON array`, { value });
        return undefined;
      }
    default:
      return undefined;
  }
}

function string(value: string) {
  return value;
}

function number(value: string) {
  const num = Number(value);
  if (isNaN(num)) return undefined;

  return num;
}

function boolean(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;

  return undefined;
}

function byte(value: string) {
  return bytes(value);
}

function ms(value: string) {
  return msFn(value);
}
