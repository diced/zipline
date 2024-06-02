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
    tempDirectory: undefined,
  },
  chunks: {
    max: undefined,
    size: undefined,
    enabled: undefined,
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
    metrics: {
      enabled: undefined,
      adminOnly: undefined,
      showUserSpecific: undefined,
    },
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
  discord: null,
  ratelimit: {
    enabled: undefined,
    max: undefined,
    window: undefined,
    adminBypass: undefined,
    allowList: undefined,
  },
};

export const PROP_TO_ENV = {
  'core.port': 'CORE_PORT',
  'core.hostname': 'CORE_HOSTNAME',
  'core.secret': 'CORE_SECRET',
  'core.databaseUrl': ['CORE_DATABASE_URL', 'DATABASE_URL'],
  'core.returnHttpsUrls': 'CORE_RETURN_HTTPS_URLS',
  'core.defaultDomain': 'CORE_DEFAULT_DOMAIN',
  'core.tempDirectory': 'CORE_TEMP_DIRECTORY',

  'chunks.max': 'CHUNKS_MAX',
  'chunks.size': 'CHUNKS_SIZE',
  'chunks.enabled': 'CHUNKS_ENABLED',

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
  'features.thumbnails.enabled': 'FEATURES_THUMBNAILS_ENABLED',
  'features.thumbnails.num_threads': 'FEATURES_THUMBNAILS_NUM_THREADS',
  'features.metrics.enabled': 'FEATURES_METRICS_ENABLED',
  'features.metrics.adminOnly': 'FEATURES_METRICS_ADMIN_ONLY',
  'features.metrics.showUserSpecific': 'FEATURES_METRICS_SHOW_USER_SPECIFIC',

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

  'discord.webhookUrl': 'DISCORD_WEBHOOK_URL',
  'discord.username': 'DISCORD_USERNAME',
  'discord.avatarUrl': 'DISCORD_AVATAR_URL',

  'discord.onUpload.webhookUrl': 'DISCORD_ONUPLOAD_WEBHOOK_URL',
  'discord.onUpload.username': 'DISCORD_ONUPLOAD_USERNAME',
  'discord.onUpload.avatarUrl': 'DISCORD_ONUPLOAD_AVATAR_URL',
  'discord.onUpload.content': 'DISCORD_ONUPLOAD_CONTENT',
  'discord.onUpload.embed.title': 'DISCORD_ONUPLOAD_EMBED_TITLE',
  'discord.onUpload.embed.description': 'DISCORD_ONUPLOAD_EMBED_DESCRIPTION',
  'discord.onUpload.embed.footer': 'DISCORD_ONUPLOAD_EMBED_FOOTER',
  'discord.onUpload.embed.color': 'DISCORD_ONUPLOAD_EMBED_COLOR',
  'discord.onUpload.embed.thumbnail': 'DISCORD_ONUPLOAD_EMBED_THUMBNAIL',
  'discord.onUpload.embed.timestamp': 'DISCORD_ONUPLOAD_EMBED_TIMESTAMP',
  'discord.onUpload.embed.imageOrVideo': 'DISCORD_ONUPLOAD_EMBED_IMAGE_OR_VIDEO',
  'discord.onUpload.embed.url': 'DISCORD_ONUPLOAD_EMBED_URL',

  'discord.onShorten.webhookUrl': 'DISCORD_ONSHORTEN_WEBHOOK_URL',
  'discord.onShorten.username': 'DISCORD_ONSHORTEN_USERNAME',
  'discord.onShorten.avatarUrl': 'DISCORD_ONSHORTEN_AVATAR_URL',
  'discord.onShorten.content': 'DISCORD_ONSHORTEN_CONTENT',
  'discord.onShorten.embed.title': 'DISCORD_ONSHORTEN_EMBED_TITLE',
  'discord.onShorten.embed.description': 'DISCORD_ONSHORTEN_EMBED_DESCRIPTION',
  'discord.onShorten.embed.footer': 'DISCORD_ONSHORTEN_EMBED_FOOTER',
  'discord.onShorten.embed.color': 'DISCORD_ONSHORTEN_EMBED_COLOR',
  'discord.onShorten.embed.timestamp': 'DISCORD_ONSHORTEN_EMBED_TIMESTAMP',
  'discord.onShorten.embed.url': 'DISCORD_ONSHORTEN_EMBED_URL',

  'ratelimit.enabled': 'RATELIMIT_ENABLED',
  'ratelimit.max': 'RATELIMIT_MAX',
  'ratelimit.window': 'RATELIMIT_WINDOW',
  'ratelimit.adminBypass': 'RATELIMIT_ADMIN_BYPASS',
  'ratelimit.allowList': 'RATELIMIT_ALLOW_LIST',
};

const logger = log('config').c('read');

export function readEnv() {
  const envs = [
    env('core.port', 'number'),
    env('core.hostname', 'string'),
    env('core.secret', 'string'),
    env('core.databaseUrl', 'string'),
    env('core.returnHttpsUrls', 'boolean'),
    env('core.defaultDomain', 'string'),
    env('core.tempDirectory', 'string'),

    env('chunks.max', 'byte'),
    env('chunks.size', 'byte'),
    env('chunks.enabled', 'boolean'),

    env('scheduler.deleteInterval', 'ms'),
    env('scheduler.clearInvitesInterval', 'ms'),
    env('scheduler.maxViewsInterval', 'ms'),
    env('scheduler.thumbnailsInterval', 'ms'),
    env('scheduler.metricsInterval', 'ms'),

    env('files.route', 'string'),
    env('files.length', 'number'),
    env('files.defaultFormat', 'string'),
    env('files.disabledExtensions', 'string[]'),
    env('files.maxFileSize', 'byte'),
    env('files.defaultExpiration', 'ms'),
    env('files.assumeMimetypes', 'boolean'),
    env('files.removeGpsMetadata', 'boolean'),

    env('urls.route', 'string'),
    env('urls.length', 'number'),

    env('datasource.type', 'string'),

    env('datasource.s3.accessKeyId', 'string'),
    env('datasource.s3.secretAccessKey', 'string'),
    env('datasource.s3.region', 'string'),
    env('datasource.s3.bucket', 'string'),

    env('datasource.local.directory', 'string'),

    env('features.imageCompression', 'boolean'),
    env('features.robotsTxt', 'boolean'),
    env('features.healthcheck', 'boolean'),
    env('features.userRegistration', 'boolean'),
    env('features.oauthRegistration', 'boolean'),
    env('features.deleteOnMaxViews', 'boolean'),
    env('features.thumbnails.enabled', 'boolean'),
    env('features.thumbnails.num_threads', 'number'),
    env('features.metrics.enabled', 'boolean'),
    env('features.metrics.adminOnly', 'boolean'),
    env('features.metrics.showUserSpecific', 'boolean'),

    env('invites.enabled', 'boolean'),
    env('invites.length', 'number'),

    env('website.title', 'string'),
    env('website.externalLinks', 'json[]'),
    env('website.loginBackground', 'string'),
    env('website.defaultAvatar', 'string'),
    env('website.theme.default', 'string'),
    env('website.theme.dark', 'string'),
    env('website.theme.light', 'string'),

    env('mfa.totp.enabled', 'boolean'),
    env('mfa.totp.issuer', 'string'),
    env('mfa.passkeys', 'boolean'),

    env('oauth.bypassLocalLogin', 'boolean'),
    env('oauth.loginOnly', 'boolean'),
    env('oauth.discord.clientId', 'string'),
    env('oauth.discord.clientSecret', 'string'),
    env('oauth.github.clientId', 'string'),
    env('oauth.github.clientSecret', 'string'),
    env('oauth.google.clientId', 'string'),
    env('oauth.google.clientSecret', 'string'),
    env('oauth.authentik.clientId', 'string'),
    env('oauth.authentik.clientSecret', 'string'),
    env('oauth.authentik.authorizeUrl', 'string'),
    env('oauth.authentik.userinfoUrl', 'string'),
    env('oauth.authentik.tokenUrl', 'string'),

    env('discord.webhookUrl', 'string'),
    env('discord.username', 'string'),
    env('discord.avatarUrl', 'string'),

    env('discord.onUpload.webhookUrl', 'string'),
    env('discord.onUpload.username', 'string'),
    env('discord.onUpload.avatarUrl', 'string'),
    env('discord.onUpload.content', 'string'),
    env('discord.onUpload.embed.title', 'string'),
    env('discord.onUpload.embed.description', 'string'),
    env('discord.onUpload.embed.footer', 'string'),
    env('discord.onUpload.embed.color', 'string'),
    env('discord.onUpload.embed.thumbnail', 'boolean'),
    env('discord.onUpload.embed.timestamp', 'boolean'),
    env('discord.onUpload.embed.imageOrVideo', 'boolean'),
    env('discord.onUpload.embed.url', 'boolean'),

    env('discord.onShorten.webhookUrl', 'string'),
    env('discord.onShorten.username', 'string'),
    env('discord.onShorten.avatarUrl', 'string'),
    env('discord.onShorten.content', 'string'),
    env('discord.onShorten.embed.title', 'string'),
    env('discord.onShorten.embed.description', 'string'),
    env('discord.onShorten.embed.footer', 'string'),
    env('discord.onShorten.embed.color', 'string'),
    env('discord.onShorten.embed.timestamp', 'boolean'),
    env('discord.onShorten.embed.url', 'boolean'),

    env('ratelimit.enabled', 'boolean'),
    env('ratelimit.max', 'number'),
    env('ratelimit.window', 'ms'),
    env('ratelimit.adminBypass', 'boolean'),
    env('ratelimit.allowList', 'string[]'),
  ];

  // clone raw
  const raw = structuredClone(rawConfig);

  for (let i = 0; i !== envs.length; ++i) {
    const env = envs[i];
    if (Array.isArray(env.variable)) {
      env.variable = env.variable.find((v) => process.env[v] !== undefined) || 'DATABASE_URL';
    }

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

function env(property: keyof typeof PROP_TO_ENV, type: EnvType) {
  return {
    variable: PROP_TO_ENV[property],
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
      return value;
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
