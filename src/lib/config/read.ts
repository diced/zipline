import msFn from 'ms';
import { log } from '../logger';
import { bytes } from '../bytes';
import { prisma } from '../db';
import { join } from 'path';
import { tmpdir } from 'os';
import { setProperty } from 'dot-prop';

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

  'datasource.local.directory': 'DATASOURCE_LOCAL_DIRECTORY',

  'website.tos': 'WEBSITE_TOS',

  // 'discord.onUpload.webhookUrl': 'DISCORD_ONUPLOAD_WEBHOOK_URL',
  // 'discord.onUpload.username': 'DISCORD_ONUPLOAD_USERNAME',
  // 'discord.onUpload.avatarUrl': 'DISCORD_ONUPLOAD_AVATAR_URL',
  // 'discord.onUpload.content': 'DISCORD_ONUPLOAD_CONTENT',
  // 'discord.onUpload.embed.title': 'DISCORD_ONUPLOAD_EMBED_TITLE',
  // 'discord.onUpload.embed.description': 'DISCORD_ONUPLOAD_EMBED_DESCRIPTION',
  // 'discord.onUpload.embed.footer': 'DISCORD_ONUPLOAD_EMBED_FOOTER',
  // 'discord.onUpload.embed.color': 'DISCORD_ONUPLOAD_EMBED_COLOR',
  // 'discord.onUpload.embed.thumbnail': 'DISCORD_ONUPLOAD_EMBED_THUMBNAIL',
  // 'discord.onUpload.embed.timestamp': 'DISCORD_ONUPLOAD_EMBED_TIMESTAMP',
  // 'discord.onUpload.embed.imageOrVideo': 'DISCORD_ONUPLOAD_EMBED_IMAGE_OR_VIDEO',
  // 'discord.onUpload.embed.url': 'DISCORD_ONUPLOAD_EMBED_URL',

  // 'discord.onShorten.webhookUrl': 'DISCORD_ONSHORTEN_WEBHOOK_URL',
  // 'discord.onShorten.username': 'DISCORD_ONSHORTEN_USERNAME',
  // 'discord.onShorten.avatarUrl': 'DISCORD_ONSHORTEN_AVATAR_URL',
  // 'discord.onShorten.content': 'DISCORD_ONSHORTEN_CONTENT',
  // 'discord.onShorten.embed.title': 'DISCORD_ONSHORTEN_EMBED_TITLE',
  // 'discord.onShorten.embed.description': 'DISCORD_ONSHORTEN_EMBED_DESCRIPTION',
  // 'discord.onShorten.embed.footer': 'DISCORD_ONSHORTEN_EMBED_FOOTER',
  // 'discord.onShorten.embed.color': 'DISCORD_ONSHORTEN_EMBED_COLOR',
  // 'discord.onShorten.embed.timestamp': 'DISCORD_ONSHORTEN_EMBED_TIMESTAMP',
  // 'discord.onShorten.embed.url': 'DISCORD_ONSHORTEN_EMBED_URL',

  'ssl.key': 'SSL_KEY',
  'ssl.cert': 'SSL_CERT',
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
  websiteDefaultAvatar: 'website.defaultAvatar',

  websiteThemeDefault: 'website.theme.default',
  websiteThemeDark: 'website.theme.dark',
  websiteThemeLight: 'website.theme.light',

  oauthBypassLocalLogin: 'oauth.bypassLocalLogin',
  oauthLoginOnly: 'oauth.loginOnly',

  oauthDiscordClientId: 'oauth.discord.clientId',
  oauthDiscordClientSecret: 'oauth.discord.clientSecret',

  oauthGoogleClientId: 'oauth.google.clientId',
  oauthGoogleClientSecret: 'oauth.google.clientSecret',

  oauthGithubClientId: 'oauth.github.clientId',
  oauthGithubClientSecret: 'oauth.github.clientSecret',

  oauthOidcClientId: 'oauth.oidc.clientId',
  oauthOidcClientSecret: 'oauth.oidc.clientSecret',
  oauthOidcAuthorizeUrl: 'oauth.oidc.authorizeUrl',
  oauthOidcUserinfoUrl: 'oauth.oidc.userinfoUrl',
  oauthOidcTokenUrl: 'oauth.oidc.tokenUrl',

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

    env('datasource.local.directory', 'string'),

    env('website.tos', 'string'),

    env('ssl.key', 'string'),
    env('ssl.cert', 'string'),
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
