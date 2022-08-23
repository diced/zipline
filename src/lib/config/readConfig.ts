import { parse } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync, readFileSync } from 'fs';

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

function map(env: string, type: 'string' | 'number' | 'boolean' | 'array', path: string) {
  return {
    env,
    type,
    path,
  };
}

export default function readConfig() {
  if (existsSync('.env.local')) {
    const contents = readFileSync('.env.local');

    expand({
      parsed: parse(contents),
    });
  }

  const maps = [
    map('CORE_HTTPS', 'boolean', 'core.secure'),
    map('CORE_SECRET', 'string', 'core.secret'),
    map('CORE_HOST', 'string', 'core.host'),
    map('CORE_PORT', 'number', 'core.port'),
    map('CORE_DATABASE_URL', 'string', 'core.database_url'),
    map('CORE_LOGGER', 'boolean', 'core.logger'),
    map('CORE_STATS_INTERVAL', 'number', 'core.stats_interval'),

    map('DATASOURCE_TYPE', 'string', 'datasource.type'),

    map('DATASOURCE_LOCAL_DIRECTORY', 'string', 'datasource.local.directory'),

    map('DATASOURCE_S3_ACCESS_KEY_ID', 'string', 'datasource.s3.access_key_id'),
    map('DATASOURCE_S3_SECRET_ACCESS_KEY', 'string', 'datasource.s3.secret_access_key'),
    map('DATASOURCE_S3_ENDPOINT', 'string', 'datasource.s3.endpoint'),
    map('DATASOURCE_S3_BUCKET', 'string', 'datasource.s3.bucket'),
    map('DATASOURCE_S3_FORCE_S3_PATH', 'boolean', 'datasource.s3.force_s3_path'),
    map('DATASOURCE_S3_REGION', 'string', 'datasource.s3.region'),

    map('DATASOURCE_SWIFT_USERNAME', 'string', 'datasource.swift.username'),
    map('DATASOURCE_SWIFT_PASSWORD', 'string', 'datasource.swift.password'),
    map('DATASOURCE_SWIFT_AUTH_ENDPOINT', 'string', 'datasource.swift.auth_endpoint'),
    map('DATASOURCE_SWIFT_CONTAINER', 'string', 'datasource.swift.container'),
    map('DATASOURCE_SWIFT_PROJECT_ID', 'string', 'datasource.swift.project_id'),
    map('DATASOURCE_SWIFT_DOMAIN_ID', 'string', 'datasource.swift.domain_id'),
    map('DATASOURCE_SWIFT_REGION_ID', 'string', 'datasource.swift.region_id'),

    map('UPLOADER_ROUTE', 'string', 'uploader.route'),
    map('UPLOADER_LENGTH', 'number', 'uploader.length'),
    map('UPLOADER_ADMIN_LIMIT', 'number', 'uploader.admin_limit'),
    map('UPLOADER_USER_LIMIT', 'number', 'uploader.user_limit'),
    map('UPLOADER_DISABLED_EXTENSIONS', 'array', 'uploader.disabled_extensions'),

    map('URLS_ROUTE', 'string', 'urls.route'),
    map('URLS_LENGTH', 'number', 'urls.length'),

    map('RATELIMIT_USER', 'number', 'ratelimit.user'),
    map('RATELIMIT_ADMIN', 'number', 'ratelimit.admin'),

    map('WEBSITE_TITLE', 'string', 'website.title'),
    map('WEBSITE_SHOW_FILES_PER_USER', 'boolean', 'website.show_files_per_user'),

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
          break;
        case 'boolean':
          parsed = value === 'true';
          break;
        default:
          parsed = value;
      };

      set(config, map.path, parsed);
    }
  }
  return config;
}