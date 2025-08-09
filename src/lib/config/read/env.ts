import { log } from '@/lib/logger';
import { parse } from './transform';

export type EnvType = 'string' | 'string[]' | 'number' | 'boolean' | 'byte' | 'ms' | 'json';
export function env(property: string, env: string | string[], type: EnvType, isDb: boolean = false) {
  return {
    variable: env,
    property,
    type,
    isDb,
  };
}

export const ENVS = [
  env('core.port', 'CORE_PORT', 'number'),
  env('core.hostname', 'CORE_HOSTNAME', 'string'),
  env('core.secret', 'CORE_SECRET', 'string'),
  env('core.databaseUrl', ['DATABASE_URL', 'CORE_DATABASE_URL'], 'string'),

  env('datasource.type', 'DATASOURCE_TYPE', 'string'),
  env('datasource.s3.accessKeyId', 'DATASOURCE_S3_ACCESS_KEY_ID', 'string'),
  env('datasource.s3.secretAccessKey', 'DATASOURCE_S3_SECRET_ACCESS_KEY', 'string'),
  env('datasource.s3.region', 'DATASOURCE_S3_REGION', 'string'),
  env('datasource.s3.bucket', 'DATASOURCE_S3_BUCKET', 'string'),
  env('datasource.s3.endpoint', 'DATASOURCE_S3_ENDPOINT', 'string'),
  env('datasource.s3.forcePathStyle', 'DATASOURCE_S3_FORCE_PATH_STYLE', 'boolean'),
  env('datasource.s3.subdirectory', 'DATASOURCE_S3_SUBDIRECTORY', 'string'),

  env('datasource.local.directory', 'DATASOURCE_LOCAL_DIRECTORY', 'string'),

  env('ssl.key', 'SSL_KEY', 'string'),
  env('ssl.cert', 'SSL_CERT', 'string'),

  // database stuff
  env('core.returnHttpsUrls', 'CORE_RETURN_HTTPS_URLS', 'boolean', true),
  env('core.defaultDomain', 'CORE_DEFAULT_DOMAIN', 'string', true),
  env('core.tempDirectory', 'CORE_TEMP_DIRECTORY', 'string', true),

  env('chunks.max', 'CHUNKS_MAX', 'string', true),
  env('chunks.size', 'CHUNKS_SIZE', 'string', true),
  env('chunks.enabled', 'CHUNKS_ENABLED', 'boolean', true),

  env('tasks.deleteInterval', 'TASKS_DELETE_INTERVAL', 'string', true),
  env('tasks.clearInvitesInterval', 'TASKS_CLEAR_INVITES_INTERVAL', 'string', true),
  env('tasks.maxViewsInterval', 'TASKS_MAX_VIEWS_INTERVAL', 'string', true),
  env('tasks.thumbnailsInterval', 'TASKS_THUMBNAILS_INTERVAL', 'string', true),
  env('tasks.metricsInterval', 'TASKS_METRICS_INTERVAL', 'string', true),

  env('files.route', 'FILES_ROUTE', 'string', true),
  env('files.length', 'FILES_LENGTH', 'number', true),
  env('files.defaultFormat', 'FILES_DEFAULT_FORMAT', 'string', true),
  env('files.disabledExtensions', 'FILES_DISABLED_EXTENSIONS', 'string[]', true),
  env('files.maxFileSize', 'FILES_MAX_FILE_SIZE', 'string', true),
  env('files.defaultExpiration', 'FILES_DEFAULT_EXPIRATION', 'string', true),
  env('files.assumeMimetypes', 'FILES_ASSUME_MIMETYPES', 'boolean', true),
  env('files.defaultDateFormat', 'FILES_DEFAULT_DATE_FORMAT', 'string', true),
  env('files.removeGpsMetadata', 'FILES_REMOVE_GPS_METADATA', 'boolean', true),
  env('files.randomWordsNumAdjectives', 'FILES_RANDOM_WORDS_NUM_ADJECTIVES', 'number', true),
  env('files.randomWordsSeparator', 'FILES_RANDOM_WORDS_SEPARATOR', 'string', true),

  env('urls.route', 'URLS_ROUTE', 'string', true),
  env('urls.length', 'URLS_LENGTH', 'number', true),

  env('features.imageCompression', 'FEATURES_IMAGE_COMPRESSION', 'boolean', true),
  env('features.robotsTxt', 'FEATURES_ROBOTS_TXT', 'boolean', true),
  env('features.healthcheck', 'FEATURES_HEALTHCHECK', 'boolean', true),
  env('features.userRegistration', 'FEATURES_USER_REGISTRATION', 'boolean', true),
  env('features.oauthRegistration', 'FEATURES_OAUTH_REGISTRATION', 'boolean', true),
  env('features.deleteOnMaxViews', 'FEATURES_DELETE_ON_MAX_VIEWS', 'boolean', true),
  env('features.thumbnails.enabled', 'FEATURES_THUMBNAILS_ENABLED', 'boolean', true),
  env('features.thumbnails.num_threads', 'FEATURES_THUMBNAILS_NUM_THREADS', 'number', true),
  env('features.metrics.enabled', 'FEATURES_METRICS_ENABLED', 'boolean', true),
  env('features.metrics.adminOnly', 'FEATURES_METRICS_ADMIN_ONLY', 'boolean', true),
  env('features.metrics.showUserSpecific', 'FEATURES_METRICS_SHOW_USER_SPECIFIC', 'boolean', true),
  env('features.versionChecking', 'FEATURES_VERSION_CHECKING', 'boolean', true),
  env('features.versionAPI', 'FEATURES_VERSION_API', 'string', true),

  env('invites.enabled', 'INVITES_ENABLED', 'boolean', true),
  env('invites.length', 'INVITES_LENGTH', 'number', true),

  env('website.title', 'WEBSITE_TITLE', 'string', true),
  env('website.titleLogo', 'WEBSITE_TITLE_LOGO', 'string', true),
  env('website.externalLinks', 'WEBSITE_EXTERNAL_LINKS', 'json', true),
  env('website.loginBackground', 'WEBSITE_LOGIN_BACKGROUND', 'string', true),
  env('website.loginBackgroundBlur', 'WEBSITE_LOGIN_BACKGROUND_BLUR', 'number', true),
  env('website.defaultAvatar', 'WEBSITE_DEFAULT_AVATAR', 'string', true),
  env('website.tos', 'WEBSITE_TOS', 'string', true),
  env('website.theme.default', 'WEBSITE_THEME_DEFAULT', 'string', true),
  env('website.theme.dark', 'WEBSITE_THEME_DARK', 'string', true),
  env('website.theme.light', 'WEBSITE_THEME_LIGHT', 'string', true),

  env('oauth.bypassLocalLogin', 'OAUTH_BYPASS_LOCAL_LOGIN', 'boolean', true),
  env('oauth.loginOnly', 'OAUTH_LOGIN_ONLY', 'boolean', true),

  env('oauth.discord.clientId', 'OAUTH_DISCORD_CLIENT_ID', 'string', true),
  env('oauth.discord.clientSecret', 'OAUTH_DISCORD_CLIENT_SECRET', 'string', true),
  env('oauth.discord.redirectUri', 'OAUTH_DISCORD_REDIRECT_URI', 'string', true),
  env('oauth.discord.allowedIds', 'OAUTH_DISCORD_ALLOWED_IDS', 'string[]', true),
  env('oauth.discord.deniedIds', 'OAUTH_DISCORD_DENIED_IDS', 'string[]', true),

  env('oauth.google.clientId', 'OAUTH_GOOGLE_CLIENT_ID', 'string', true),
  env('oauth.google.clientSecret', 'OAUTH_GOOGLE_CLIENT_SECRET', 'string', true),
  env('oauth.google.redirectUri', 'OAUTH_GOOGLE_REDIRECT_URI', 'string', true),

  env('oauth.github.clientId', 'OAUTH_GITHUB_CLIENT_ID', 'string', true),
  env('oauth.github.clientSecret', 'OAUTH_GITHUB_CLIENT_SECRET', 'string', true),
  env('oauth.github.redirectUri', 'OAUTH_GITHUB_REDIRECT_URI', 'string', true),

  env('oauth.oidc.clientId', 'OAUTH_OIDC_CLIENT_ID', 'string', true),
  env('oauth.oidc.clientSecret', 'OAUTH_OIDC_CLIENT_SECRET', 'string', true),
  env('oauth.oidc.authorizeUrl', 'OAUTH_OIDC_AUTHORIZE_URL', 'string', true),
  env('oauth.oidc.userinfoUrl', 'OAUTH_OIDC_USERINFO_URL', 'string', true),
  env('oauth.oidc.tokenUrl', 'OAUTH_OIDC_TOKEN_URL', 'string', true),
  env('oauth.oidc.redirectUri', 'OAUTH_OIDC_REDIRECT_URI', 'string', true),

  env('mfa.totp.enabled', 'MFA_TOTP_ENABLED', 'boolean', true),
  env('mfa.totp.issuer', 'MFA_TOTP_ISSUER', 'string', true),
  env('mfa.passkeys', 'MFA_PASSKEYS', 'boolean', true),

  env('ratelimit.enabled', 'RATELIMIT_ENABLED', 'boolean', true),
  env('ratelimit.max', 'RATELIMIT_MAX', 'number', true),
  env('ratelimit.window', 'RATELIMIT_WINDOW', 'number', true),
  env('ratelimit.adminBypass', 'RATELIMIT_ADMIN_BYPASS', 'boolean', true),
  env('ratelimit.allowList', 'RATELIMIT_ALLOW_LIST', 'string[]', true),

  env('httpWebhook.onUpload', 'HTTP_WEBHOOK_ON_UPLOAD', 'string', true),
  env('httpWebhook.onShorten', 'HTTP_WEBHOOK_ON_SHORTEN', 'string', true),

  env('discord.webhookUrl', 'DISCORD_WEBHOOK_URL', 'string', true),
  env('discord.username', 'DISCORD_USERNAME', 'string', true),
  env('discord.avatarUrl', 'DISCORD_AVATAR_URL', 'string', true),
  env('discord.onUpload.webhookUrl', 'DISCORD_ON_UPLOAD_WEBHOOK_URL', 'string', true),
  env('discord.onUpload.username', 'DISCORD_ON_UPLOAD_USERNAME', 'string', true),
  env('discord.onUpload.avatarUrl', 'DISCORD_ON_UPLOAD_AVATAR_URL', 'string', true),
  env('discord.onUpload.content', 'DISCORD_ON_UPLOAD_CONTENT', 'string', true),
  env('discord.onUpload.embed', 'DISCORD_ON_UPLOAD_EMBED', 'json', true),
  env('discord.onShorten.webhookUrl', 'DISCORD_ON_SHORTEN_WEBHOOK_URL', 'string', true),
  env('discord.onShorten.username', 'DISCORD_ON_SHORTEN_USERNAME', 'string', true),
  env('discord.onShorten.avatarUrl', 'DISCORD_ON_SHORTEN_AVATAR_URL', 'string', true),
  env('discord.onShorten.content', 'DISCORD_ON_SHORTEN_CONTENT', 'string', true),
  env('discord.onShorten.embed', 'DISCORD_ON_SHORTEN_EMBED', 'json', true),

  env('pwa.enabled', 'PWA_ENABLED', 'boolean', true),
  env('pwa.title', 'PWA_TITLE', 'string', true),
  env('pwa.shortName', 'PWA_SHORT_NAME', 'string', true),
  env('pwa.description', 'PWA_DESCRIPTION', 'string', true),
  env('pwa.backgroundColor', 'PWA_BACKGROUND_COLOR', 'string', true),
  env('pwa.themeColor', 'PWA_THEME_COLOR', 'string', true),
];

export const PROP_TO_ENV: Record<string, string | string[]> = Object.fromEntries(
  ENVS.map((env) => [env.property, env.variable]),
);

type EnvResult = {
  env: Record<string, any>;
  dbEnv: Record<string, any>;
};

export function readEnv(): EnvResult {
  const logger = log('config').c('readEnv');
  const envResult: EnvResult = {
    env: {},
    dbEnv: {},
  };

  for (let i = 0; i !== ENVS.length; ++i) {
    const env = ENVS[i];
    if (Array.isArray(env.variable)) {
      env.variable = env.variable.find((v) => process.env[v] !== undefined) || 'DATABASE_URL';
    }

    const value = process.env[env.variable];

    if (value === undefined) continue;

    if (env.variable === 'DATASOURCE_TYPE') {
      if (value === 's3') {
        envResult.env['datasource.s3.accessKeyId'] = undefined;
        envResult.env['datasource.s3.secretAccessKey'] = undefined;
        envResult.env['datasource.s3.region'] = undefined;
        envResult.env['datasource.s3.bucket'] = undefined;
      } else if (value === 'local') {
        envResult.env['datasource.local.directory'] = undefined;
      }
    }

    const parsed = parse.bind({ logger })(value, env.type);
    if (parsed === undefined) continue;

    if (env.isDb) {
      envResult.dbEnv[env.property] = parsed;
    } else {
      envResult.env[env.property] = parsed;
    }
  }

  return envResult;
}
