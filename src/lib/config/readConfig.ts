import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import parse from '@iarna/toml/parse-string';
import Logger from '../logger';
import { Config } from './Config';

const e = (val, type, fn: (c: Config, v: any) => void) => ({ val, type, fn });

const envValues = [
  e('SECURE', 'boolean', (c, v) => c.core.secure = v),
  e('SECRET', 'string', (c, v) => c.core.secret = v),
  e('HOST', 'string', (c, v) => c.core.host = v),
  e('PORT', 'number', (c, v) => c.core.port = v),
  e('DATABASE_URL', 'string', (c, v) => c.core.database_url = v),
  e('LOGGER', 'boolean', (c, v) => c.core.logger = v ?? true),
  e('STATS_INTERVAL', 'number', (c, v) => c.core.stats_interval = v),

  e('DATASOURCE_TYPE', 'string', (c, v) => c.datasource.type = v),
  e('DATASOURCE_LOCAL_DIRECTORY', 'string', (c, v) => c.datasource.local.directory = v),
  e('DATASOURCE_S3_ACCESS_KEY_ID', 'string', (c, v) => c.datasource.s3.access_key_id = v),
  e('DATASOURCE_S3_SECRET_ACCESS_KEY', 'string', (c, v) => c.datasource.s3.secret_access_key = v),
  e('DATASOURCE_S3_ENDPOINT', 'string', (c, v) => c.datasource.s3.endpoint = v ?? null),
  e('DATASOURCE_S3_FORCE_S3_PATH', 'boolean', (c, v) => c.datasource.s3.force_s3_path = v ?? false),
  e('DATASOURCE_S3_BUCKET', 'string', (c, v) => c.datasource.s3.bucket = v),
  e('DATASOURCE_S3_REGION', 'string', (c, v) => c.datasource.s3.region = v ?? 'us-east-1'),

  e('DATASOURCE_SWIFT_CONTAINER', 'string', (c, v) => c.datasource.swift.container = v),
  e('DATASOURCE_SWIFT_USERNAME', 'string', (c, v) => c.datasource.swift.username = v),
  e('DATASOURCE_SWIFT_PASSWORD', 'string', (c, v) => c.datasource.swift.password = v),
  e('DATASOURCE_SWIFT_AUTH_ENDPOINT', 'string', (c, v) => c.datasource.swift.auth_endpoint = v),
  e('DATASOURCE_SWIFT_PROJECT_ID', 'string', (c, v) => c.datasource.swift.project_id = v),
  e('DATASOURCE_SWIFT_DOMAIN_ID', 'string', (c, v) => c.datasource.swift.domain_id = v),
  e('DATASOURCE_SWIFT_REGION_ID', 'string', (c, v) => c.datasource.swift.region_id = v),

  e('UPLOADER_ROUTE', 'string', (c, v) => c.uploader.route = v),
  e('UPLOADER_LENGTH', 'number', (c, v) => c.uploader.length = v),
  e('UPLOADER_ADMIN_LIMIT', 'number', (c, v) => c.uploader.admin_limit = v),
  e('UPLOADER_USER_LIMIT', 'number', (c, v) => c.uploader.user_limit = v),
  e('UPLOADER_DISABLED_EXTS', 'array', (c, v) => v ? c.uploader.disabled_extensions = v : c.uploader.disabled_extensions = []),

  e('URLS_ROUTE', 'string', (c, v) => c.urls.route = v),
  e('URLS_LENGTH', 'number', (c, v) => c.urls.length = v),

  e('RATELIMIT_USER', 'number', (c, v) => c.ratelimit.user = v ?? 0),
  e('RATELIMIT_ADMIN', 'number', (c, v) => c.ratelimit.user = v ?? 0),
];

export default function readConfig(): Config {
  if (!existsSync(join(process.cwd(), 'config.toml'))) {
    if (!process.env.ZIPLINE_DOCKER_BUILD) Logger.get('config').info('reading environment');
    return tryReadEnv();
  } else {
    if (process.env.ZIPLINE_DOCKER_BUILD) return;

    Logger.get('config').info('reading config file');
    const str = readFileSync(join(process.cwd(), 'config.toml'), 'utf8');
    const parsed = parse(str);

    return parsed;
  }
};

function tryReadEnv(): Config {
  const config = {
    core: {
      secure: undefined,
      secret: undefined,
      host: undefined,
      port: undefined,
      database_url: undefined,
      logger: undefined,
      stats_interval: undefined,
    },
    datasource: {
      type: undefined,
      local: {
        directory: undefined,
      },
      s3: {
        access_key_id: undefined,
        secret_access_key: undefined,
        endpoint: undefined,
        bucket: undefined,
        force_s3_path: undefined,
        region: undefined,
      },
      swift: {
        username: undefined,
        password: undefined,
        auth_endpoint: undefined,
        container: undefined,
        project_id: undefined,
        domain_id: undefined,
        region_id: undefined,
      },
    },
    uploader: {
      route: undefined,
      length: undefined,
      admin_limit: undefined,
      user_limit: undefined,
      disabled_extensions: undefined,
    },
    urls: {
      route: undefined,
      length: undefined,
    },
    ratelimit: {
      user: undefined,
      admin: undefined,
    },
  };

  for (let i = 0, L = envValues.length; i !== L; ++i) {
    const envValue = envValues[i];
    let value: any = process.env[envValue.val];

    if (!value) {
      envValues[i].fn(config, undefined);
    } else {
      envValues[i].fn(config, value);
      if (envValue.type === 'number') value = parseToNumber(value);
      else if (envValue.type === 'boolean') value = parseToBoolean(value);
      else if (envValue.type === 'array') value = parseToArray(value);
      envValues[i].fn(config, value);
    }
  }


  switch (config.datasource.type) {
    case 's3':
      config.datasource.swift = undefined;
      break;
    case 'swift':
      config.datasource.s3 = undefined;
      break;
    case 'local':
      config.datasource.s3 = undefined;
      config.datasource.swift = undefined;
      break;
    default:
      config.datasource.local = {
        directory: null,
      };
      config.datasource.s3 = undefined;
      config.datasource.swift = undefined;
      break;
  }

  return config;
}

function parseToNumber(value) {
  // infer that it is a string since env values are only strings
  const number = Number(value);
  if (isNaN(number)) return undefined;
  return number;
}

function parseToBoolean(value) {
  // infer that it is a string since env values are only strings
  if (!value || value === 'false') return false;
  else return true;
}

function parseToArray(value) {
  return value.split(',');
}
