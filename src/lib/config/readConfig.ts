import { parse } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import Logger from '../logger';
import { humanToBytes } from '../utils/bytes';

export type ValueType = 'string' | 'number' | 'boolean' | 'array' | 'json-array' | 'human-to-byte' | 'path';

function isObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function set(object: Record<string, any>, property: string, value: any) {
  const parts = property.split('.');

  for (let i = 0; i < parts.length; ++i) {
    const key = parts[i];

    if (i === parts.length - 1) {
      object[key] = value;
    } else if (!isObject(object[key])) {
      object[key] = typeof parts[i + 1] === 'number' ? [] : {};
    }

    object = object[key];
  }

  return object;
}

function map(env: string, type: ValueType, path: string) {
  return {
    env,
    type,
    path,
  };
}

export default function readConfig() {
  const logger = Logger.get('config');

  logger.debug('attemping to read .env.local/.env or environment variables');
  if (existsSync('.env.local')) {
    const contents = readFileSync('.env.local');

    expand({
      parsed: parse(contents),
    });
  } else if (existsSync('.env')) {
    const contents = readFileSync('.env');

    expand({
      parsed: parse(contents),
    });
  }

  const maps = [
    map('CORE_RETURN_HTTPS', 'boolean', 'core.return_https'),
    map('CORE_SECRET', 'string', 'core.secret'),
    map('CORE_HOST', 'string', 'core.host'),
    map('CORE_PORT', 'number', 'core.port'),
    map('CORE_DATABASE_URL', 'string', 'core.database_url'),
    map('CORE_LOGGER', 'boolean', 'core.logger'),
    map('CORE_STATS_INTERVAL', 'number', 'core.stats_interval'),
    map('CORE_INVITES_INTERVAL', 'number', 'core.invites_interval'),

    map('DATASOURCE_TYPE', 'string', 'datasource.type'),

    map('DATASOURCE_LOCAL_DIRECTORY', 'string', 'datasource.local.directory'),

    map('DATASOURCE_S3_ACCESS_KEY_ID', 'string', 'datasource.s3.access_key_id'),
    map('DATASOURCE_S3_SECRET_ACCESS_KEY', 'string', 'datasource.s3.secret_access_key'),
    map('DATASOURCE_S3_ENDPOINT', 'string', 'datasource.s3.endpoint'),
    map('DATASOURCE_S3_PORT', 'number', 'datasource.s3.port'),
    map('DATASOURCE_S3_BUCKET', 'string', 'datasource.s3.bucket'),
    map('DATASOURCE_S3_FORCE_S3_PATH', 'boolean', 'datasource.s3.force_s3_path'),
    map('DATASOURCE_S3_REGION', 'string', 'datasource.s3.region'),
    map('DATASOURCE_S3_USE_SSL', 'boolean', 'datasource.s3.use_ssl'),

    map('DATASOURCE_SUPABASE_URL', 'string', 'datasource.supabase.url'),
    map('DATASOURCE_SUPABASE_KEY', 'string', 'datasource.supabase.key'),
    map('DATASOURCE_SUPABASE_BUCKET', 'string', 'datasource.supabase.bucket'),

    map('UPLOADER_DEFAULT_FORMAT', 'string', 'uploader.default_format'),
    map('UPLOADER_ROUTE', 'string', 'uploader.route'),
    map('UPLOADER_LENGTH', 'number', 'uploader.length'),
    map('UPLOADER_ADMIN_LIMIT', 'human-to-byte', 'uploader.admin_limit'),
    map('UPLOADER_USER_LIMIT', 'human-to-byte', 'uploader.user_limit'),
    map('UPLOADER_DISABLED_EXTENSIONS', 'array', 'uploader.disabled_extensions'),
    map('UPLOADER_FORMAT_DATE', 'string', 'uploader.format_date'),
    map('UPLOADER_DEFAULT_EXPIRATION', 'string', 'uploader.default_expiration'),

    map('URLS_ROUTE', 'string', 'urls.route'),
    map('URLS_LENGTH', 'number', 'urls.length'),

    map('RATELIMIT_USER', 'number', 'ratelimit.user'),
    map('RATELIMIT_ADMIN', 'number', 'ratelimit.admin'),

    map('WEBSITE_TITLE', 'string', 'website.title'),
    map('WEBSITE_SHOW_FILES_PER_USER', 'boolean', 'website.show_files_per_user'),
    map('WEBSITE_SHOW_VERSION', 'boolean', 'website.show_version'),
    map('WEBSITE_DISABLE_MEDIA_PREVIEW', 'boolean', 'website.disable_media_preview'),
    map('WEBSITE_EXTERNAL_LINKS', 'json-array', 'website.external_links'),

    map('DISCORD_URL', 'string', 'discord.url'),
    map('DISCORD_USERNAME', 'string', 'discord.username'),
    map('DISCORD_AVATAR_URL', 'string', 'discord.avatar_url'),

    map('DISCORD_UPLOAD_CONTENT', 'string', 'discord.upload.content'),
    map('DISCORD_UPLOAD_EMBED_TITLE', 'string', 'discord.upload.embed.title'),
    map('DISCORD_UPLOAD_EMBED_DESCRIPTION', 'string', 'discord.upload.embed.description'),
    map('DISCORD_UPLOAD_EMBED_FOOTER', 'string', 'discord.upload.embed.footer'),
    map('DISCORD_UPLOAD_EMBED_COLOR', 'number', 'discord.upload.embed.color'),
    map('DISCORD_UPLOAD_EMBED_IMAGE', 'boolean', 'discord.upload.embed.image'),
    map('DISCORD_UPLOAD_EMBED_THUMBNAIL', 'boolean', 'discord.upload.embed.thumbnail'),
    map('DISCORD_UPLOAD_EMBED_TIMESTAMP', 'boolean', 'discord.upload.embed.timestamp'),

    map('DISCORD_SHORTEN_CONTENT', 'string', 'discord.shorten.content'),
    map('DISCORD_SHORTEN_EMBED_TITLE', 'string', 'discord.shorten.embed.title'),
    map('DISCORD_SHORTEN_EMBED_DESCRIPTION', 'string', 'discord.shorten.embed.description'),
    map('DISCORD_SHORTEN_EMBED_FOOTER', 'string', 'discord.shorten.embed.footer'),
    map('DISCORD_SHORTEN_EMBED_COLOR', 'number', 'discord.shorten.embed.color'),
    map('DISCORD_SHORTEN_EMBED_IMAGE', 'boolean', 'discord.shorten.embed.image'),
    map('DISCORD_SHORTEN_EMBED_THUMBNAIL', 'boolean', 'discord.shorten.embed.thumbnail'),
    map('DISCORD_SHORTEN_EMBED_TIMESTAMP', 'boolean', 'discord.shorten.embed.timestamp'),

    map('OAUTH_GITHUB_CLIENT_ID', 'string', 'oauth.github_client_id'),
    map('OAUTH_GITHUB_CLIENT_SECRET', 'string', 'oauth.github_client_secret'),

    map('OAUTH_DISCORD_CLIENT_ID', 'string', 'oauth.discord_client_id'),
    map('OAUTH_DISCORD_CLIENT_SECRET', 'string', 'oauth.discord_client_secret'),

    map('OAUTH_GOOGLE_CLIENT_ID', 'string', 'oauth.google_client_id'),
    map('OAUTH_GOOGLE_CLIENT_SECRET', 'string', 'oauth.google_client_secret'),

    map('FEATURES_INVITES', 'boolean', 'features.invites'),
    map('FEATURES_INVITES_LENGTH', 'number', 'features.invites_length'),

    map('FEATURES_OAUTH_REGISTRATION', 'boolean', 'features.oauth_registration'),
    map('FEATURES_OAUTH_LOGIN_ONLY', 'boolean', 'features.oauth_login_only'),
    map('FEATURES_USER_REGISTRATION', 'boolean', 'features.user_registration'),

    map('FEATURES_HEADLESS', 'boolean', 'features.headless'),

    map('CHUNKS_MAX_SIZE', 'human-to-byte', 'chunks.max_size'),
    map('CHUNKS_CHUNKS_SIZE', 'human-to-byte', 'chunks.chunks_size'),

    map('MFA_TOTP_ISSUER', 'string', 'mfa.totp_issuer'),
    map('MFA_TOTP_ENABLED', 'boolean', 'mfa.totp_enabled'),

    map('EXIF_ENABLED', 'boolean', 'exif.enabled'),
    map('EXIF_REMOVE_GPS', 'boolean', 'exif.remove_gps'),

    map('SSL_KEY', 'path', 'ssl.key'),
    map('SSL_CERT', 'path', 'ssl.cert'),
    map('SSL_ALLOW_HTTP1', 'boolean', 'ssl.allow_http1'),
  ];

  const config = {};

  for (let i = 0; i !== maps.length; ++i) {
    const map = maps[i];

    const value = process.env[map.env];

    if (value) {
      let parsed: any;
      switch (map.type) {
        case 'array':
          parsed = value.split(',');
          break;
        case 'number':
          parsed = Number(value);
          if (isNaN(parsed)) {
            parsed = undefined;
            logger.debug(`Failed to parse number ${map.env}=${value}`);
          }
          break;
        case 'boolean':
          parsed = value === 'true';
          break;
        case 'json-array':
          try {
            parsed = JSON.parse(value);
          } catch (e) {
            logger.debug(`Failed to parse JSON array ${map.env}=${value}`);
          }
          break;
        case 'human-to-byte':
          parsed = humanToBytes(value) ?? undefined;
          if (!parsed) logger.debug(`Unable to parse ${map.env}=${value}`);

          break;
        case 'path':
          parsed = resolve(value);
          if (!existsSync(parsed)) logger.debug(`Unable to find ${map.env}=${value} (path does not exist)`);
          break;
        default:
          parsed = value;
          break;
      }

      set(config, map.path, parsed);
    }
  }
  return config;
}
