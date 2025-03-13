import msFn, { StringValue } from 'ms';
import { log } from '../logger';
import { bytes } from '../bytes';
import { prisma } from '../db';
import { join } from 'path';
import { tmpdir } from 'os';

type EnvType = 'string' | 'string[]' | 'number' | 'boolean' | 'byte' | 'ms' | 'json[]';

export type ParsedConfig = ReturnType<typeof read>;

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
  tasks: {
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
    randomWordsNumAdjectives: undefined,
    randomWordsSeparator: undefined,
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
    titleLogo: undefined,
    externalLinks: undefined,
    loginBackground: undefined,
    defaultAvatar: undefined,
    tos: undefined,
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
    oidc: {
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
  httpWebhook: {
    onUpload: undefined,
    onShorten: undefined,
  },
  ssl: {
    key: undefined,
    cert: undefined,
  },
  pwa: {
    enabled: undefined,
    title: undefined,
    shortName: undefined,
    description: undefined,
    backgroundColor: undefined,
    themeColor: undefined,
  },
};

export const PROP_TO_ENV = {
  'core.port': 'CORE_PORT',
  'core.hostname': 'CORE_HOSTNAME',
  'core.secret': 'CORE_SECRET',
  'core.databaseUrl': ['CORE_DATABASE_URL', 'DATABASE_URL'],

  'datasource.type': 'DATASOURCE_TYPE',

  // only for errors, not used in readenv
  'datasource.s3': 'DATASOURCE_S3_*',
  'datasource.local': 'DATASOURCE_LOCAL_*',

  'datasource.s3.accessKeyId': 'DATASOURCE_S3_ACCESS_KEY_ID',
  'datasource.s3.secretAccessKey': 'DATASOURCE_S3_SECRET_ACCESS_KEY',
  'datasource.s3.region': 'DATASOURCE_S3_REGION',
  'datasource.s3.bucket': 'DATASOURCE_S3_BUCKET',
  'datasource.s3.endpoint': 'DATASOURCE_S3_ENDPOINT',
  'datasource.s3.forcePathStyle': 'DATASOURCE_S3_FORCE_PATH_STYLE',

  'datasource.local.directory': 'DATASOURCE_LOCAL_DIRECTORY',

  'ssl.key': 'SSL_KEY',
  'ssl.cert': 'SSL_CERT',

  'core.returnHttpsUrls': 'CORE_RETURN_HTTPS_URLS',
  'core.defaultDomain': 'CORE_DEFAULT_DOMAIN',
  'core.tempDirectory': 'CORE_TEMP_DIRECTORY',

  'chunks.max': 'CHUNKS_MAX',
  'chunks.size': 'CHUNKS_SIZE',
  'chunks.enabled': 'CHUNKS_ENABLED',

  'tasks.deleteInterval': 'TASKS_DELETE_INTERVAL',
  'tasks.clearInvitesInterval': 'TASKS_CLEAR_INVITES_INTERVAL',
  'tasks.maxViewsInterval': 'TASKS_MAX_VIEWS_INTERVAL',
  'tasks.thumbnailsInterval': 'TASKS_THUMBNAILS_INTERVAL',
  'tasks.metricsInterval': 'TASKS_METRICS_INTERVAL',

  'files.route': 'FILES_ROUTE',
  'files.length': 'FILES_LENGTH',
  'files.defaultFormat': 'FILES_DEFAULT_FORMAT',
  'files.disabledExtensions': 'FILES_DISABLED_EXTENSIONS',
  'files.maxFileSize': 'FILES_MAX_FILE_SIZE',
  'files.defaultExpiration': 'FILES_DEFAULT_EXPIRATION',
  'files.assumeMimetypes': 'FILES_ASSUME_MIMETYPES',
  'files.defaultDateFormat': 'FILES_DEFAULT_DATE_FORMAT',
  'files.removeGpsMetadata': 'FILES_REMOVE_GPS_METADATA',
  'files.randomWordsNumAdjectives': 'FILES_RANDOM_WORDS_NUM_ADJECTIVES',
  'files.randomWordsSeparator': 'FILES_RANDOM_WORDS_SEPARATOR',

  'urls.route': 'URLS_ROUTE',
  'urls.length': 'URLS_LENGTH',

  'features.imageCompression': 'FEATURES_IMAGE_COMPRESSION',
  'features.robotsTxt': 'FEATURES_ROBOTS_TXT',
  'features.healthcheck': 'FEATURES_HEALTHCHECK',
  'features.userRegistration': 'FEATURES_USER_REGISTRATION',
  'features.oauthRegistration': 'FEATURES_OAUTH_REGISTRATION',
  'features.deleteOnMaxViews': 'FEATURES_DELETE_ON_MAX_VIEWS',
  'features.thumbnails.enabled': 'FEATURES_THUMBNAILS_ENABLED',
  'features.thumbnails.num_threads': 'FEATURES_THUMBNAILS_NUMBER_THREADS',
  'features.metrics.enabled': 'FEATURES_METRICS_ENABLED',
  'features.metrics.adminOnly': 'FEATURES_METRICS_ADMIN_ONLY',
  'features.metrics.showUserSpecific': 'FEATURES_METRICS_SHOW_USER_SPECIFIC',

  'invites.enabled': 'INVITES_ENABLED',
  'invites.length': 'INVITES_LENGTH',

  'website.title': 'WEBSITE_TITLE',
  'website.titleLogo': 'WEBSITE_TITLE_LOGO',
  'website.externalLinks': 'WEBSITE_EXTERNAL_LINKS',
  'website.loginBackground': 'WEBSITE_LOGIN_BACKGROUND',
  'website.loginBackgroundBlur': 'WEBSITE_LOGIN_BACKGROUND_BLUR',
  'website.defaultAvatar': 'WEBSITE_DEFAULT_AVATAR',
  'website.tos': 'WEBSITE_TOS',
  'website.theme.default': 'WEBSITE_THEME_DEFAULT',
  'website.theme.dark': 'WEBSITE_THEME_DARK',
  'website.theme.light': 'WEBSITE_THEME_LIGHT',

  'oauth.bypassLocalLogin': 'OAUTH_BYPASS_LOCAL_LOGIN',
  'oauth.loginOnly': 'OAUTH_LOGIN_ONLY',
  'oauth.discord.clientId': 'OAUTH_DISCORD_CLIENT_ID',
  'oauth.discord.clientSecret': 'OAUTH_DISCORD_CLIENT_SECRET',
  'oauth.discord.redirectUri': 'OAUTH_DISCORD_REDIRECT_URI',
  'oauth.google.clientId': 'OAUTH_GOOGLE_CLIENT_ID',
  'oauth.google.clientSecret': 'OAUTH_GOOGLE_CLIENT_SECRET',
  'oauth.google.redirectUri': 'OAUTH_GOOGLE_REDIRECT_URI',
  'oauth.github.clientId': 'OAUTH_GITHUB_CLIENT_ID',
  'oauth.github.clientSecret': 'OAUTH_GITHUB_CLIENT_SECRET',
  'oauth.github.redirectUri': 'OAUTH_GITHUB_REDIRECT_URI',
  'oauth.oidc.clientId': 'OAUTH_OIDC_CLIENT_ID',
  'oauth.oidc.clientSecret': 'OAUTH_OIDC_CLIENT_SECRET',
  'oauth.oidc.authorizeUrl': 'OAUTH_OIDC_AUTHORIZE_URL',
  'oauth.oidc.userinfoUrl': 'OAUTH_OIDC_USERINFO_URL',
  'oauth.oidc.tokenUrl': 'OAUTH_OIDC_TOKEN_URL',
  'oauth.oidc.redirectUri': 'OAUTH_OIDC_REDIRECT_URI',

  'mfa.totp.enabled': 'MFA_TOTP_ENABLED',
  'mfa.totp.issuer': 'MFA_TOTP_ISSUER',
  'mfa.passkeys': 'MFA_PASSKEYS',

  'ratelimit.enabled': 'RATELIMIT_ENABLED',
  'ratelimit.max': 'RATELIMIT_MAX',
  'ratelimit.window': 'RATELIMIT_WINDOW',
  'ratelimit.adminBypass': 'RATELIMIT_ADMIN_BYPASS',
  'ratelimit.allowList': 'RATELIMIT_ALLOW_LIST',

  'httpWebhook.onUpload': 'HTTPWEBHOOK_ON_UPLOAD',
  'httpWebhook.onShorten': 'HTTPWEBHOOK_ON_SHORTEN',

  'discord.webhookUrl': 'DISCORD_WEBHOOK_URL',
  'discord.username': 'DISCORD_USERNAME',
  'discord.avatarUrl': 'DISCORD_AVATAR_URL',
  'discord.onUpload.webhookUrl': 'DISCORD_ON_UPLOAD_WEBHOOK_URL',
  'discord.onUpload.username': 'DISCORD_ON_UPLOAD_USERNAME',
  'discord.onUpload.avatarUrl': 'DISCORD_ON_UPLOAD_AVATAR_URL',
  'discord.onUpload.content': 'DISCORD_ON_UPLOAD_CONTENT',
  'discord.onUpload.embed': 'DISCORD_ON_UPLOAD_EMBED',
  'discord.onShorten.webhookUrl': 'DISCORD_ON_SHORTEN_WEBHOOK_URL',
  'discord.onShorten.username': 'DISCORD_ON_SHORTEN_USERNAME',
  'discord.onShorten.avatarUrl': 'DISCORD_ON_SHORTEN_AVATAR_URL',
  'discord.onShorten.content': 'DISCORD_ON_SHORTEN_CONTENT',
  'discord.onShorten.embed': 'DISCORD_ON_SHORTEN_EMBED',

  'pwa.enabled': 'PWA_ENABLED',
  'pwa.title': 'PWA_TITLE',
  'pwa.shortName': 'PWA_SHORT_NAME',
  'pwa.description': 'PWA_DESCRIPTION',
  'pwa.themeColor': 'PWA_THEME_COLOR',
  'pwa.backgroundColor': 'PWA_BACKGROUND_COLOR',
};

export const DATABASE_TO_PROP = {
  coreReturnHttpsUrls: 'core.returnHttpsUrls',
  coreDefaultDomain: 'core.defaultDomain',
  coreTempDirectory: 'core.tempDirectory',

  chunksMax: 'chunks.max',
  chunksSize: 'chunks.size',
  chunksEnabled: 'chunks.enabled',

  tasksDeleteInterval: 'tasks.deleteInterval',
  tasksClearInvitesInterval: 'tasks.clearInvitesInterval',
  tasksMaxViewsInterval: 'tasks.maxViewsInterval',
  tasksThumbnailsInterval: 'tasks.thumbnailsInterval',
  tasksMetricsInterval: 'tasks.metricsInterval',

  filesRoute: 'files.route',
  filesLength: 'files.length',
  filesDefaultFormat: 'files.defaultFormat',
  filesDisabledExtensions: 'files.disabledExtensions',
  filesMaxFileSize: 'files.maxFileSize',
  filesDefaultExpiration: 'files.defaultExpiration',
  filesAssumeMimetypes: 'files.assumeMimetypes',
  filesDefaultDateFormat: 'files.defaultDateFormat',
  filesRemoveGpsMetadata: 'files.removeGpsMetadata',
  filesRandomWordsNumAdjectives: 'files.randomWordsNumAdjectives',
  filesRandomWordsSeparator: 'files.randomWordsSeparator',

  urlsRoute: 'urls.route',
  urlsLength: 'urls.length',

  featuresImageCompression: 'features.imageCompression',
  featuresRobotsTxt: 'features.robotsTxt',
  featuresHealthcheck: 'features.healthcheck',
  featuresUserRegistration: 'features.userRegistration',
  featuresOauthRegistration: 'features.oauthRegistration',
  featuresDeleteOnMaxViews: 'features.deleteOnMaxViews',

  featuresThumbnailsEnabled: 'features.thumbnails.enabled',
  featuresThumbnailsNumberThreads: 'features.thumbnails.num_threads',

  featuresMetricsEnabled: 'features.metrics.enabled',
  featuresMetricsAdminOnly: 'features.metrics.adminOnly',
  featuresMetricsShowUserSpecific: 'features.metrics.showUserSpecific',

  invitesEnabled: 'invites.enabled',
  invitesLength: 'invites.length',

  websiteTitle: 'website.title',
  websiteTitleLogo: 'website.titleLogo',
  websiteExternalLinks: 'website.externalLinks',
  websiteLoginBackground: 'website.loginBackground',
  websiteLoginBackgroundBlur: 'website.loginBackgroundBlur',
  websiteDefaultAvatar: 'website.defaultAvatar',
  websiteTos: 'website.tos',

  websiteThemeDefault: 'website.theme.default',
  websiteThemeDark: 'website.theme.dark',
  websiteThemeLight: 'website.theme.light',

  oauthBypassLocalLogin: 'oauth.bypassLocalLogin',
  oauthLoginOnly: 'oauth.loginOnly',

  oauthDiscordClientId: 'oauth.discord.clientId',
  oauthDiscordClientSecret: 'oauth.discord.clientSecret',
  oauthDiscordRedirectUri: 'oauth.discord.redirectUri',

  oauthGoogleClientId: 'oauth.google.clientId',
  oauthGoogleClientSecret: 'oauth.google.clientSecret',
  oauthGoogleRedirectUri: 'oauth.google.redirectUri',

  oauthGithubClientId: 'oauth.github.clientId',
  oauthGithubClientSecret: 'oauth.github.clientSecret',
  oauthGithubRedirectUri: 'oauth.github.redirectUri',

  oauthOidcClientId: 'oauth.oidc.clientId',
  oauthOidcClientSecret: 'oauth.oidc.clientSecret',
  oauthOidcAuthorizeUrl: 'oauth.oidc.authorizeUrl',
  oauthOidcUserinfoUrl: 'oauth.oidc.userinfoUrl',
  oauthOidcTokenUrl: 'oauth.oidc.tokenUrl',
  oauthOidcRedirectUri: 'oauth.oidc.redirectUri',

  mfaTotpEnabled: 'mfa.totp.enabled',
  mfaTotpIssuer: 'mfa.totp.issuer',
  mfaPasskeys: 'mfa.passkeys',

  ratelimitEnabled: 'ratelimit.enabled',
  ratelimitMax: 'ratelimit.max',
  ratelimitWindow: 'ratelimit.window',
  ratelimitAdminBypass: 'ratelimit.adminBypass',
  ratelimitAllowList: 'ratelimit.allowList',

  httpWebhookOnUpload: 'httpWebhook.onUpload',
  httpWebhookOnShorten: 'httpWebhook.onShorten',

  discordWebhookUrl: 'discord.webhookUrl',
  discordUsername: 'discord.username',
  discordAvatarUrl: 'discord.avatarUrl',

  discordOnUploadWebhookUrl: 'discord.onUpload.webhookUrl',
  discordOnUploadUsername: 'discord.onUpload.username',
  discordOnUploadAvatarUrl: 'discord.onUpload.avatarUrl',
  discordOnUploadContent: 'discord.onUpload.content',
  discordOnUploadEmbed: 'discord.onUpload.embed',

  discordOnShortenWebhookUrl: 'discord.onShorten.webhookUrl',
  discordOnShortenUsername: 'discord.onShorten.username',
  discordOnShortenAvatarUrl: 'discord.onShorten.avatarUrl',
  discordOnShortenContent: 'discord.onShorten.content',
  discordOnShortenEmbed: 'discord.onShorten.embed',

  pwaEnabled: 'pwa.enabled',
  pwaTitle: 'pwa.title',
  pwaShortName: 'pwa.shortName',
  pwaDescription: 'pwa.description',
  pwaThemeColor: 'pwa.themeColor',
  pwaBackgroundColor: 'pwa.backgroundColor',
};

const logger = log('config').c('read');

export async function readDatabaseSettings() {
  let ziplineTable = await prisma.zipline.findFirst({
    omit: {
      createdAt: true,
      updatedAt: true,
      id: true,
      firstSetup: true,
    },
  });

  if (!ziplineTable) {
    ziplineTable = await prisma.zipline.create({
      data: {
        coreTempDirectory: join(tmpdir(), 'zipline'),
      },
      omit: {
        createdAt: true,
        updatedAt: true,
        id: true,
        firstSetup: true,
      },
    });
  }

  return ziplineTable;
}

export function readEnv() {
  const envs = [
    env('core.port', 'number'),
    env('core.hostname', 'string'),
    env('core.secret', 'string'),
    env('core.databaseUrl', 'string'),

    env('datasource.type', 'string'),

    env('datasource.s3.accessKeyId', 'string'),
    env('datasource.s3.secretAccessKey', 'string'),
    env('datasource.s3.region', 'string'),
    env('datasource.s3.bucket', 'string'),
    env('datasource.s3.endpoint', 'string'),
    env('datasource.s3.forcePathStyle', 'boolean'),

    env('datasource.local.directory', 'string'),

    env('ssl.key', 'string'),
    env('ssl.cert', 'string'),

    env('core.returnHttpsUrls', 'boolean'),
    env('core.defaultDomain', 'string'),
    env('core.tempDirectory', 'string'),

    env('chunks.max', 'string'),
    env('chunks.size', 'string'),
    env('chunks.enabled', 'boolean'),

    env('tasks.deleteInterval', 'string'),
    env('tasks.clearInvitesInterval', 'string'),
    env('tasks.maxViewsInterval', 'string'),
    env('tasks.thumbnailsInterval', 'string'),
    env('tasks.metricsInterval', 'string'),

    env('files.route', 'string'),
    env('files.length', 'number'),
    env('files.defaultFormat', 'string'),
    env('files.disabledExtensions', 'string[]'),
    env('files.maxFileSize', 'string'),
    env('files.defaultExpiration', 'string'),
    env('files.assumeMimetypes', 'boolean'),
    env('files.defaultDateFormat', 'string'),
    env('files.removeGpsMetadata', 'boolean'),
    env('files.randomWordsNumAdjectives', 'number'),
    env('files.randomWordsSeparator', 'string'),

    env('urls.route', 'string'),
    env('urls.length', 'number'),

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
    env('website.titleLogo', 'string'),
    env('website.externalLinks', 'json[]'),
    env('website.loginBackground', 'string'),
    env('website.loginBackgroundBlur', 'boolean'),
    env('website.defaultAvatar', 'string'),
    env('website.tos', 'string'),
    env('website.theme.default', 'string'),
    env('website.theme.dark', 'string'),
    env('website.theme.light', 'string'),

    env('oauth.bypassLocalLogin', 'boolean'),
    env('oauth.loginOnly', 'boolean'),
    env('oauth.discord.clientId', 'string'),
    env('oauth.discord.clientSecret', 'string'),
    env('oauth.discord.redirectUri', 'string'),
    env('oauth.google.clientId', 'string'),
    env('oauth.google.clientSecret', 'string'),
    env('oauth.google.redirectUri', 'string'),
    env('oauth.github.clientId', 'string'),
    env('oauth.github.clientSecret', 'string'),
    env('oauth.github.redirectUri', 'string'),
    env('oauth.oidc.clientId', 'string'),
    env('oauth.oidc.clientSecret', 'string'),
    env('oauth.oidc.authorizeUrl', 'string'),
    env('oauth.oidc.userinfoUrl', 'string'),
    env('oauth.oidc.tokenUrl', 'string'),
    env('oauth.oidc.redirectUri', 'string'),

    env('mfa.totp.enabled', 'boolean'),
    env('mfa.totp.issuer', 'string'),
    env('mfa.passkeys', 'boolean'),

    env('ratelimit.enabled', 'boolean'),
    env('ratelimit.max', 'number'),
    env('ratelimit.window', 'number'),
    env('ratelimit.adminBypass', 'boolean'),
    env('ratelimit.allowList', 'string[]'),

    env('httpWebhook.onUpload', 'string'),
    env('httpWebhook.onShorten', 'string'),

    env('discord.webhookUrl', 'string'),
    env('discord.username', 'string'),
    env('discord.avatarUrl', 'string'),
    env('discord.onUpload.webhookUrl', 'string'),
    env('discord.onUpload.username', 'string'),
    env('discord.onUpload.avatarUrl', 'string'),
    env('discord.onUpload.content', 'string'),
    env('discord.onUpload.embed', 'json[]'),
    env('discord.onShorten.webhookUrl', 'string'),
    env('discord.onShorten.username', 'string'),
    env('discord.onShorten.avatarUrl', 'string'),
    env('discord.onShorten.content', 'string'),
    env('discord.onShorten.embed', 'json[]'),

    env('pwa.enabled', 'boolean'),
    env('pwa.title', 'string'),
    env('pwa.shortName', 'string'),
    env('pwa.description', 'string'),
    env('pwa.themeColor', 'string'),
    env('pwa.backgroundColor', 'string'),
  ];

  const raw: Record<keyof typeof rawConfig, any> = {};

  for (let i = 0; i !== envs.length; ++i) {
    const env = envs[i];
    if (Array.isArray(env.variable)) {
      env.variable = env.variable.find((v) => process.env[v] !== undefined) || 'DATABASE_URL';
    }

    const value = process.env[env.variable];

    if (value === undefined) continue;

    if (env.variable === 'DATASOURCE_TYPE') {
      if (value === 's3') {
        raw['datasource.s3.accessKeyId'] = undefined;
        raw['datasource.s3.secretAccessKey'] = undefined;
        raw['datasource.s3.region'] = undefined;
        raw['datasource.s3.bucket'] = undefined;
      } else if (value === 'local') {
        raw['datasource.local.directory'] = undefined;
      }
    }

    const parsed = parse(value, env.type);
    if (parsed === undefined) continue;

    raw[env.property] = parsed;
  }

  return raw;
}

export async function read() {
  const database = await readDatabaseSettings();
  const env = readEnv();

  const raw = structuredClone(rawConfig);

  for (const [key, value] of Object.entries(database as Record<string, any>)) {
    if (value === undefined) {
      logger.warn('Missing database value', { key });
      continue;
    }

    if (!DATABASE_TO_PROP[key as keyof typeof DATABASE_TO_PROP]) continue;
    if (value == undefined) continue;

    setProperty(raw, DATABASE_TO_PROP[key as keyof typeof DATABASE_TO_PROP], value);
  }

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      logger.warn('Missing env value', { key });
      continue;
    }

    setProperty(raw, key, value);
  }

  return raw;
}

export function replaceDatabaseValueWithEnv<T>(
  Key: keyof typeof DATABASE_TO_PROP,
  databaseValue: T,
  typeString: EnvType,
): T {
  const envKeys = databaseToEnv(Key);

  for (let i = 0; i !== envKeys.length; ++i) {
    const value = process.env[envKeys[i]];
    if (value === undefined) continue;

    const parsed = parse(value, typeString);
    if (parsed === undefined) continue;

    return parsed;
  }

  return databaseValue;
}

export function valueIsFromEnv(Key: keyof typeof DATABASE_TO_PROP): string | undefined {
  const envKeys = databaseToEnv(Key);

  for (let i = 0; i !== envKeys.length; ++i) {
    const value = process.env[envKeys[i]];
    if (value !== undefined) return value;
  }

  return undefined;
}

export function databaseToEnv(key: keyof typeof DATABASE_TO_PROP): string[] {
  const prop = PROP_TO_ENV[DATABASE_TO_PROP[key] as keyof typeof PROP_TO_ENV];
  if (!prop) return [];
  if (typeof prop === 'string') return [prop];
  return prop;
}

function isObject(value: any) {
  return typeof value === 'object' && value !== null;
}

function setProperty(obj: any, path: string, value: any) {
  if (!isObject(obj)) return obj;

  const root = obj;
  const dot = path.split('.');

  for (let i = 0; i !== dot.length; ++i) {
    const key = dot[i];

    if (i === dot.length - 1) {
      obj[key] = value;
    } else if (!isObject(obj[key])) {
      obj[key] = typeof dot[i + 1] === 'number' ? [] : {};
    }

    obj = obj[key];
  }

  return root;
}

function env(property: keyof typeof PROP_TO_ENV, type: EnvType) {
  return {
    variable: PROP_TO_ENV[property],
    property,
    type,
  };
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
      return msFn(value as StringValue);
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
