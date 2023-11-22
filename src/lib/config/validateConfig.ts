import { s } from '@sapphire/shapeshift';
import type { Config } from './Config';
import { inspect } from 'util';
import Logger from 'lib/logger';
import { humanToBytes } from 'utils/bytes';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const discord_content = s
  .object({
    url: s.string.nullish.default(null),
    username: s.string.nullish.default(null),
    avatar_url: s.string.nullish.default(null),
    content: s.string.nullish.default(null),
    embed: s
      .object({
        title: s.string.nullish.default(null),
        description: s.string.nullish.default(null),
        footer: s.string.nullish.default(null),
        color: s.number.notEqual(NaN).nullish.default(null),
        thumbnail: s.boolean.default(false),
        image: s.boolean.default(true),
        timestamp: s.boolean.default(true),
      })
      .default(null),
  })
  .default(null);

const validator = s.object({
  core: s.object({
    return_https: s.boolean.default(false),
    temp_directory: s.string.default(join(tmpdir(), 'zipline')),
    secret: s.string.lengthGreaterThanOrEqual(8),
    host: s.string.default('0.0.0.0'),
    port: s.number.default(3000),
    database_url: s.string,
    logger: s.boolean.default(false),
    stats_interval: s.number.default(1800), // 30m
    invites_interval: s.number.default(1800), // 30m
    thumbnails_interval: s.number.default(600), // 10m
    compression: s
      .object({
        enabled: s.boolean.default(false),
        threshold: s.number.default(2048),
        on_dashboard: s.boolean.default(true),
      })
      .default({
        enabled: false,
        on_dashboard: false,
      }),
  }),
  datasource: s
    .object({
      type: s.enum('local', 's3', 'supabase').default('local'),
      local: s
        .object({
          directory: s.string.default(resolve('./uploads')).transform((v) => resolve(v)),
        })
        .default({
          directory: './uploads',
        }),
      s3: s.object({
        access_key_id: s.string,
        secret_access_key: s.string,
        endpoint: s.string,
        port: s.number.optional.default(undefined),
        bucket: s.string,
        force_s3_path: s.boolean.default(false),
        region: s.string.default('us-east-1'),
        use_ssl: s.boolean.default(false),
      }).optional,
      supabase: s.object({
        url: s.string,
        key: s.string,
        bucket: s.string,
      }).optional,
    })
    .default({
      type: 'local',
      local: {
        directory: './uploads',
      },
      s3: {
        region: 'us-east-1',
        force_s3_path: false,
      },
    }),
  uploader: s
    .object({
      default_format: s.string.default('RANDOM'),
      route: s.string.default('/u'),
      embed_route: s.string.default('/a'),
      length: s.number.default(6),
      admin_limit: s.number.default(humanToBytes('100MB')),
      user_limit: s.number.default(humanToBytes('100MB')),
      disabled_extensions: s.string.array.default([]),
      format_date: s.string.default('YYYY-MM-DD_HH:mm:ss'),
      default_expiration: s.string.optional.default(null),
      assume_mimetypes: s.boolean.default(false),
      random_words_separator: s.string.default('-'),
    })
    .default({
      default_format: 'RANDOM',
      route: '/u',
      embed_route: '/a',
      length: 6,
      admin_limit: humanToBytes('100MB'),
      user_limit: humanToBytes('100MB'),
      disabled_extensions: [],
      format_date: 'YYYY-MM-DD_HH:mm:ss',
      default_expiration: null,
      assume_mimetypes: false,
    }),
  urls: s
    .object({
      route: s.string.default('/go'),
      length: s.number.default(6),
    })
    .default({
      route: '/go',
      length: 6,
    }),
  ratelimit: s
    .object({
      user: s.number.default(0),
      admin: s.number.default(0),
    })
    .default({
      user: 0,
      admin: 0,
    }),
  website: s
    .object({
      title: s.string.default('Zipline'),
      show_files_per_user: s.boolean.default(true),
      show_version: s.boolean.default(true),
      disable_media_preview: s.boolean.default(false),

      external_links: s
        .array(
          s.object({
            label: s.string,
            link: s.string,
          }),
        )
        .default([
          { label: 'Zipline', link: 'https://github.com/diced/zipline' },
          { label: 'Documentation', link: 'https://zipline.diced.sh/' },
        ]),
    })
    .default({
      title: 'Zipline',
      show_files_per_user: true,
      show_version: true,
      disable_media_preview: false,

      external_links: [
        { label: 'Zipline', link: 'https://github.com/diced/zipline' },
        { label: 'Documentation', link: 'https://zipline.diced.sh/' },
      ],
    }),
  discord: s
    .object({
      url: s.string.nullish.default(null),
      username: s.string.nullish.default(null),
      avatar_url: s.string.nullish.default(null),
      upload: discord_content,
      shorten: discord_content,
    })
    .nullish.default(null),
  oauth: s
    .object({
      bypass_local_login: s.boolean.default(false),

      github_client_id: s.string.nullable.default(null),
      github_client_secret: s.string.nullable.default(null),

      discord_client_id: s.string.nullable.default(null),
      discord_client_secret: s.string.nullable.default(null),
      discord_redirect_uri: s.string.nullable.default(null),
      discord_whitelisted_users: s.string.array.default([]),

      google_client_id: s.string.nullable.default(null),
      google_client_secret: s.string.nullable.default(null),
      google_redirect_uri: s.string.nullable.default(null),
    })
    .nullish.default(null),
  features: s
    .object({
      invites: s.boolean.default(false),
      invites_length: s.number.default(6),
      oauth_registration: s.boolean.default(false),
      oauth_login_only: s.boolean.default(false),
      user_registration: s.boolean.default(false),
      headless: s.boolean.default(false),
      default_avatar: s.string.nullable.default(null),
      robots_txt: s.boolean.default(false),
      thumbnails: s.boolean.default(false),
    })
    .default({
      invites: false,
      invites_length: 6,
      oauth_registration: false,
      oauth_login_only: false,
      user_registration: false,
      headless: false,
      default_avatar: null,
      robots_txt: false,
      thumbnails: false,
    }),
  chunks: s
    .object({
      max_size: s.number.default(humanToBytes('90MB')),
      chunks_size: s.number.default(humanToBytes('20MB')),
      enabled: s.boolean.default(true),
    })
    .default({
      max_size: humanToBytes('90MB'),
      chunks_size: humanToBytes('20MB'),
      enabled: true,
    }),
  mfa: s
    .object({
      totp_issuer: s.string.default('Zipline'),
      totp_enabled: s.boolean.default(false),
    })
    .default({
      totp_issuer: 'Zipline',
      totp_enabled: false,
    }),
  exif: s
    .object({
      enabled: s.boolean.default(false),
      remove_gps: s.boolean.default(false),
    })
    .default({
      enabled: false,
      remove_gps: false,
    }),
  ssl: s
    .object({
      key: s.string,
      cert: s.string,
      allow_http1: s.boolean.default(false),
    })
    .optional.nullish.default(null),
});

export default function validate(config): Config {
  const logger = Logger.get('config');

  try {
    logger.debug(`Attemping to validate ${JSON.stringify(config)}`);
    const validated = validator.parse(config);
    logger.debug(`Recieved config: ${JSON.stringify(validated)}`);
    switch (validated.datasource.type) {
      case 's3': {
        const errors = [];
        if (!validated.datasource.s3.access_key_id)
          errors.push('datasource.s3.access_key_id is a required field');
        if (!validated.datasource.s3.secret_access_key)
          errors.push('datasource.s3.secret_access_key is a required field');
        if (!validated.datasource.s3.bucket) errors.push('datasource.s3.bucket is a required field');
        if (!validated.datasource.s3.endpoint) errors.push('datasource.s3.endpoint is a required field');
        if (errors.length) throw { errors };
        break;
      }
      case 'supabase': {
        const errors = [];

        if (!validated.datasource.supabase.key) errors.push('datasource.supabase.key is a required field');
        if (!validated.datasource.supabase.url) errors.push('datasource.supabase.url is a required field');
        if (!validated.datasource.supabase.bucket)
          errors.push('datasource.supabase.bucket is a required field');
        if (errors.length) throw { errors };

        break;
      }
    }

    const reserved = ['/view', '/dashboard', '/code', '/folder', '/api', '/auth'];
    if (reserved.some((r) => validated.uploader.route.startsWith(r))) {
      throw {
        errors: [`The uploader route cannot be ${validated.uploader.route}, this is a reserved route.`],
        show: true,
      };
    } else if (reserved.some((r) => validated.urls.route.startsWith(r))) {
      throw {
        errors: [`The urls route cannot be ${validated.urls.route}, this is a reserved route.`],
        show: true,
      };
    }

    return validated as unknown as Config;
  } catch (e) {
    if (process.env.ZIPLINE_DOCKER_BUILD) return null;

    if (e.show) {
      Logger.get('config').error('Config is invalid, see below:').error(e.errors.join('\n'));
      process.exit(1);
    }

    logger.debug(`config error: ${inspect(e, { depth: Infinity })}`);

    e.stack = '';

    Logger.get('config')
      .error('Config is invalid, see below:')
      .error(inspect(e, { depth: Infinity, colors: true }));

    process.exit(1);
  }
}
