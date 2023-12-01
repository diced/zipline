import msFn from 'ms';
import { log } from '../logger';
import { bytes } from '../bytes';

type EnvType = 'string' | 'string[]' | 'number' | 'boolean' | 'byte' | 'ms' | 'json[]';

export type ParsedEnv = ReturnType<typeof readEnv>;

export const rawConfig: any = {
  core: {
    port: undefined,
    hostname: undefined,
    secret: undefined,
    databaseUrl: undefined,
    returnHttpsUrls: undefined,
  },
  scheduler: {
    deleteInterval: undefined,
    clearInvitesInterval: undefined,
    maxViewsInterval: undefined,
    thumbnailsInterval: undefined,
    metricsInterval: undefined,
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
    removeGpsMetadata: undefined,
  },
  urls: {
    route: undefined,
    length: undefined,
  },
  datasource: {
    type: undefined,
  },
  features: {
    imageCompression: undefined,
    robotsTxt: undefined,
    healthcheck: undefined,
    invites: undefined,
    userRegistration: undefined,
    oauthRegistration: undefined,
    deleteOnMaxViews: undefined,
    thumbnails: {
      enabled: undefined,
      num_threads: undefined,
    },
    metrics: undefined,
  },
  invites: {
    enabled: undefined,
    length: undefined,
  },
  website: {
    title: undefined,
    externalLinks: undefined,
    loginBackground: undefined,
    defaultAvatar: undefined,
    theme: {
      default: undefined,
      dark: undefined,
      light: undefined,
    },
  },
  mfa: {
    totp: {
      enabled: undefined,
      issuer: undefined,
    },
    passkeys: undefined,
  },
  oauth: {
    bypassLocalLogin: undefined,
    loginOnly: undefined,
    discord: {
      clientId: undefined,
      clientSecret: undefined,
    },
    github: {
      clientId: undefined,
      clientSecret: undefined,
    },
    google: {
      clientId: undefined,
      clientSecret: undefined,
    },
    authentik: {
      clientId: undefined,
      clientSecret: undefined,
      authorizeUrl: undefined,
      userinfoUrl: undefined,
      tokenUrl: undefined,
    },
  },
};

export const PROP_TO_ENV: Record<string, string> = {
  'core.port': 'CORE_PORT',
  'core.hostname': 'CORE_HOSTNAME',
  'core.secret': 'CORE_SECRET',
  'core.databaseUrl': 'CORE_DATABASE_URL',
  'core.returnHttpsUrls': 'CORE_RETURN_HTTPS_URLS',
  'core.defaultDomain': 'CORE_DEFAULT_DOMAIN',

  'scheduler.deleteInterval': 'SCHEDULER_DELETE_INTERVAL',
  'scheduler.clearInvitesInterval': 'SCHEDULER_CLEAR_INVITES_INTERVAL',
  'scheduler.maxViewsInterval': 'SCHEDULER_MAX_VIEWS_INTERVAL',
  'scheduler.thumbnailsInterval': 'SCHEDULER_THUMBNAILS_INTERVAL',
  'scheduler.metricsInterval': 'SCHEDULER_METRICS_INTERVAL',

  'files.route': 'FILES_ROUTE',
  'files.length': 'FILES_LENGTH',
  'files.defaultFormat': 'FILES_DEFAULT_FORMAT',
  'files.disabledExtensions': 'FILES_DISABLED_EXTENSIONS',
  'files.maxFileSize': 'FILES_MAX_FILE_SIZE',
  'files.defaultExpiration': 'FILES_DEFAULT_EXPIRATION',
  'files.assumeMimetypes': 'FILES_ASSUME_MIMETYPES',
  'files.defaultDateFormat': 'FILES_DEFAULT_DATE_FORMAT',
  'files.removeGpsMetadata': 'FILES_REMOVE_GPS_METADATA',

  'urls.route': 'URLS_ROUTE',
  'urls.length': 'URLS_LENGTH',

  'datasource.type': 'DATASOURCE_TYPE',

  // only for errors, not used in readenv
  'datasource.s3': 'DATASOURCE_S3_*',
  'datasource.local': 'DATASOURCE_LOCAL_*',

  'datasource.s3.accessKeyId': 'DATASOURCE_S3_ACCESS_KEY_ID',
  'datasource.s3.secretAccessKey': 'DATASOURCE_S3_SECRET_ACCESS_KEY',
  'datasource.s3.region': 'DATASOURCE_S3_REGION',
  'datasource.s3.bucket': 'DATASOURCE_S3_BUCKET',

  'datasource.local.directory': 'DATASOURCE_LOCAL_DIRECTORY',

  'features.imageCompression': 'FEATURES_IMAGE_COMPRESSION',
  'features.robotsTxt': 'FEATURES_ROBOTS_TXT',
  'features.healthcheck': 'FEATURES_HEALTHCHECK',
  'features.userRegistration': 'FEATURES_USER_REGISTRATION',
  'features.oauthRegistration': 'FEATURES_OAUTH_REGISTRATION',
  'features.deleteOnMaxViews': 'FEATURES_DELETE_ON_MAX_VIEWS',
  'features.thumbails.enabled': 'FEATURES_THUMBNAILS_ENABLED',
  'features.thumbnails.num_threads': 'FEATURES_THUMBNAILS_NUM_THREADS',
  'features.metrics': 'FEATURES_METRICS',

  'invites.enabled': 'INVITES_ENABLED',
  'invites.length': 'INVITES_LENGTH',

  'website.title': 'WEBSITE_TITLE',
  'website.externalLinks': 'WEBSITE_EXTERNAL_LINKS',
  'website.loginBackground': 'WEBSITE_LOGIN_BACKGROUND',
  'website.defaultAvatar': 'WEBSITE_DEFAULT_AVATAR',
  'website.theme.default': 'WEBSITE_THEME_DEFAULT',
  'website.theme.dark': 'WEBSITE_THEME_DARK',
  'website.theme.light': 'WEBSITE_THEME_LIGHT',

  'mfa.totp.enabled': 'MFA_TOTP_ENABLED',
  'mfa.totp.issuer': 'MFA_TOTP_ISSUER',
  'mfa.passkeys': 'MFA_PASSKEYS',

  'oauth.bypassLocalLogin': 'OAUTH_BYPASS_LOCAL_LOGIN',
  'oauth.loginOnly': 'OAUTH_LOGIN_ONLY',
  'oauth.discord.clientId': 'OAUTH_DISCORD_CLIENT_ID',
  'oauth.discord.clientSecret': 'OAUTH_DISCORD_CLIENT_SECRET',
  'oauth.github.clientId': 'OAUTH_GITHUB_CLIENT_ID',
  'oauth.github.clientSecret': 'OAUTH_GITHUB_CLIENT_SECRET',
  'oauth.google.clientId': 'OAUTH_GOOGLE_CLIENT_ID',
  'oauth.google.clientSecret': 'OAUTH_GOOGLE_CLIENT_SECRET',
  'oauth.authentik.clientId': 'OAUTH_AUTHENTIK_CLIENT_ID',
  'oauth.authentik.clientSecret': 'OAUTH_AUTHENTIK_CLIENT_SECRET',
  'oauth.authentik.authorizeUrl': 'OAUTH_AUTHENTIK_AUTHORIZE_URL',
  'oauth.authentik.userinfoUrl': 'OAUTH_AUTHENTIK_USERINFO_URL',
  'oauth.authentik.tokenUrl': 'OAUTH_AUTHENTIK_TOKEN_URL',
};

const logger = log('config').c('read');

export function readEnv() {
  const envs = [
    env(PROP_TO_ENV['core.port'], 'core.port', 'number'),
    env(PROP_TO_ENV['core.hostname'], 'core.hostname', 'string'),
    env(PROP_TO_ENV['core.secret'], 'core.secret', 'string'),
    env(PROP_TO_ENV['core.databaseUrl'], 'core.databaseUrl', 'string'),
    env(PROP_TO_ENV['core.returnHttpsUrls'], 'core.returnHttpsUrls', 'boolean'),
    env(PROP_TO_ENV['core.defaultDomain'], 'core.defaultDomain', 'string'),

    env(PROP_TO_ENV['scheduler.deleteInterval'], 'scheduler.deleteInterval', 'ms'),
    env(PROP_TO_ENV['scheduler.clearInvitesInterval'], 'scheduler.clearInvitesInterval', 'ms'),
    env(PROP_TO_ENV['scheduler.maxViewsInterval'], 'scheduler.maxViewsInterval', 'ms'),
    env(PROP_TO_ENV['scheduler.thumbnailsInterval'], 'scheduler.thumbnailsInterval', 'ms'),
    env(PROP_TO_ENV['scheduler.metricsInterval'], 'scheduler.metricsInterval', 'ms'),

    env(PROP_TO_ENV['files.route'], 'files.route', 'string'),
    env(PROP_TO_ENV['files.length'], 'files.length', 'number'),
    env(PROP_TO_ENV['files.defaultFormat'], 'files.defaultFormat', 'string'),
    env(PROP_TO_ENV['files.disabledExtensions'], 'files.disabledExtensions', 'string[]'),
    env(PROP_TO_ENV['files.maxFileSize'], 'files.maxFileSize', 'byte'),
    env(PROP_TO_ENV['files.defaultExpiration'], 'files.defaultExpiration', 'ms'),
    env(PROP_TO_ENV['files.assumeMimetypes'], 'files.assumeMimetypes', 'boolean'),
    env(PROP_TO_ENV['files.removeGpsMetadata'], 'files.removeGpsMetadata', 'boolean'),

    env(PROP_TO_ENV['urls.route'], 'urls.route', 'string'),
    env(PROP_TO_ENV['urls.length'], 'urls.length', 'number'),

    env(PROP_TO_ENV['datasource.type'], 'datasource.type', 'string'),

    env(PROP_TO_ENV['datasource.s3.accessKeyId'], 'datasource.s3.accessKeyId', 'string'),
    env(PROP_TO_ENV['datasource.s3.secretAccessKey'], 'datasource.s3.secretAccessKey', 'string'),
    env(PROP_TO_ENV['datasource.s3.region'], 'datasource.s3.region', 'string'),
    env(PROP_TO_ENV['datasource.s3.bucket'], 'datasource.s3.bucket', 'string'),

    env(PROP_TO_ENV['datasource.local.directory'], 'datasource.local.directory', 'string'),

    env(PROP_TO_ENV['features.imageCompression'], 'features.imageCompression', 'boolean'),
    env(PROP_TO_ENV['features.robotsTxt'], 'features.robotsTxt', 'boolean'),
    env(PROP_TO_ENV['features.healthcheck'], 'features.healthcheck', 'boolean'),
    env(PROP_TO_ENV['features.invites'], 'features.invites', 'boolean'),
    env(PROP_TO_ENV['features.userRegistration'], 'features.userRegistration', 'boolean'),
    env(PROP_TO_ENV['features.oauthRegistration'], 'features.oauthRegistration', 'boolean'),
    env(PROP_TO_ENV['features.deleteOnMaxViews'], 'features.deleteOnMaxViews', 'boolean'),
    env(PROP_TO_ENV['features.thumbnails.enabled'], 'features.thumbnails.enabled', 'boolean'),
    env(PROP_TO_ENV['features.thumbnails.num_threads'], 'features.thumbnails.num_threads', 'number'),
    env(PROP_TO_ENV['features.metrics'], 'features.metrics', 'boolean'),

    env(PROP_TO_ENV['invites.enabled'], 'invites.enabled', 'boolean'),
    env(PROP_TO_ENV['invites.length'], 'invites.length', 'number'),

    env(PROP_TO_ENV['website.title'], 'website.title', 'string'),
    env(PROP_TO_ENV['website.externalLinks'], 'website.externalLinks', 'json[]'),
    env(PROP_TO_ENV['website.loginBackground'], 'website.loginBackground', 'string'),
    env(PROP_TO_ENV['website.defaultAvatar'], 'website.defaultAvatar', 'string'),
    env(PROP_TO_ENV['website.theme.default'], 'website.theme.default', 'string'),
    env(PROP_TO_ENV['website.theme.dark'], 'website.theme.dark', 'string'),
    env(PROP_TO_ENV['website.theme.light'], 'website.theme.light', 'string'),

    env(PROP_TO_ENV['mfa.totp.enabled'], 'mfa.totp.enabled', 'boolean'),
    env(PROP_TO_ENV['mfa.totp.issuer'], 'mfa.totp.issuer', 'string'),
    env(PROP_TO_ENV['mfa.passkeys'], 'mfa.passkeys', 'boolean'),

    env(PROP_TO_ENV['oauth.bypassLocalLogin'], 'oauth.bypassLocalLogin', 'boolean'),
    env(PROP_TO_ENV['oauth.loginOnly'], 'oauth.loginOnly', 'boolean'),
    env(PROP_TO_ENV['oauth.discord.clientId'], 'oauth.discord.clientId', 'string'),
    env(PROP_TO_ENV['oauth.discord.clientSecret'], 'oauth.discord.clientSecret', 'string'),
    env(PROP_TO_ENV['oauth.github.clientId'], 'oauth.github.clientId', 'string'),
    env(PROP_TO_ENV['oauth.github.clientSecret'], 'oauth.github.clientSecret', 'string'),
    env(PROP_TO_ENV['oauth.google.clientId'], 'oauth.google.clientId', 'string'),
    env(PROP_TO_ENV['oauth.google.clientSecret'], 'oauth.google.clientSecret', 'string'),
    env(PROP_TO_ENV['oauth.authentik.clientId'], 'oauth.authentik.clientId', 'string'),
    env(PROP_TO_ENV['oauth.authentik.clientSecret'], 'oauth.authentik.clientSecret', 'string'),
    env(PROP_TO_ENV['oauth.authentik.authorizeUrl'], 'oauth.authentik.authorizeUrl', 'string'),
    env(PROP_TO_ENV['oauth.authentik.userinfoUrl'], 'oauth.authentik.userinfoUrl', 'string'),
    env(PROP_TO_ENV['oauth.authentik.tokenUrl'], 'oauth.authentik.tokenUrl', 'string'),
  ];

  // clone raw
  const raw = structuredClone(rawConfig);

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
      return bytes(value);
    case 'ms':
      return msFn(value);
    case 'json[]':
      try {
        return JSON.parse(value);
      } catch {
        logger.error('Failed to parse JSON array', { value });
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
