import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { z } from 'zod';
import { log } from '../logger';
import { ParsedConfig } from './read';
import { PROP_TO_ENV } from './read/env';
import { checkOutput, COMPRESS_TYPES } from '../compress';
import ms, { StringValue } from 'ms';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      ZIPLINE_BUILD?: string;
      ZIPLINE_DB_LOG?: string;
      ZIPLINE_OVERRIDE_DISABLED_WORKER_LOG?: string;
    }
  }
}

export const MIME_REGEX = /^[a-zA-Z0-9!#$&^_\-\+.]+\/[a-zA-Z0-9!#$&^_\-\+.]+$/gi;

export const MAX_SAFE_TIMEOUT_MS = 2147483647;

export function validateInterval(value: string): boolean {
  const intervalMs = ms(value as StringValue);
  if (typeof intervalMs !== 'number') return false;

  return intervalMs <= MAX_SAFE_TIMEOUT_MS;
}

const intervalSchema = (defaultValue: string) =>
  z
    .string()
    .default(defaultValue)
    .refine(validateInterval, `Value must be less than or equal to ${MAX_SAFE_TIMEOUT_MS}ms`);

export const discordContent = z
  .object({
    webhookUrl: z.url().nullable().default(null),
    username: z.string().nullable().default(null),
    avatarUrl: z.string().nullable().default(null),
    content: z.string().nullable().default(null),
    embed: z
      .object({
        title: z.string().nullable().default(null),
        description: z.string().nullable().default(null),
        footer: z.string().nullable().default(null),
        color: z
          .string()
          .regex(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/)
          .nullable()
          .default(null),
        thumbnail: z.boolean().default(false),
        imageOrVideo: z.boolean().default(false),
        timestamp: z.boolean().default(false),
        url: z.boolean().default(false),
      })
      .nullable()
      .default(null),
  })
  .nullable()
  .default(null);

export const schema = z.object({
  core: z.object({
    port: z.number().default(3000),
    hostname: z.string().default('0.0.0.0'),
    secret: z.string().superRefine((s, c) => {
      if (s === 'changethis')
        return c.addIssue({
          code: 'custom',
          message: 'Secret must be changed from the default value',
        });

      if (s.length < 32) {
        return c.addIssue({
          code: 'too_small',
          minimum: 32,
          type: 'string',
          inclusive: true,
          message: 'Secret must contain at least 32 characters',
          exact: false,
          origin: 'string',
        });
      }
    }),
    returnHttpsUrls: z.boolean().default(false),
    defaultDomain: z.string().nullable().default(null),
    tempDirectory: z
      .string()
      .transform((s) => resolve(s))
      .default(join(tmpdir(), 'zipline')),
    trustProxy: z.boolean().default(false),

    databaseUrl: z.url(),

    database: z
      .object({
        username: z.string().nullable().default(null),
        password: z.string().nullable().default(null),
        host: z.string().nullable().default(null),
        port: z.number().nullable().default(null),
        name: z.string().nullable().default(null),
      })
      .superRefine((val, c) => {
        const values = Object.values(val);
        const someSet = values.some((v) => v !== null);
        const allSet = values.every((v) => v !== null);

        if (someSet && !allSet) {
          c.addIssue({
            code: 'custom',
            message: 'If one database field is set, all fields must be set',
          });
        }
      }),
  }),
  chunks: z.object({
    max: z.string().default('95mb'),
    size: z.string().default('25mb'),
    enabled: z.boolean().default(true),
  }),
  tasks: z.object({
    deleteInterval: intervalSchema('30min'),
    clearInvitesInterval: intervalSchema('30min'),
    maxViewsInterval: intervalSchema('30min'),
    thumbnailsInterval: intervalSchema('30min'),
    metricsInterval: intervalSchema('30min'),
    cleanThumbnailsInterval: intervalSchema('1d'),
  }),
  files: z.object({
    route: z.string().startsWith('/').min(1).trim().toLowerCase().default('/u'),
    length: z.number().default(6),
    defaultFormat: z.enum(['random', 'date', 'uuid', 'name', 'gfycat', 'random-words']).default('random'),
    disabledTypes: z.array(z.string().regex(MIME_REGEX, 'Invalid MIME type format')).default([]),
    disabledTypesDefault: z.string().nullable().default(null),
    disabledExtensions: z.array(z.string()).default([]),
    maxFileSize: z.string().default('100mb'),
    defaultExpiration: z.string().nullable().default(null),
    maxExpiration: z.string().nullable().default(null),
    assumeMimetypes: z.boolean().default(false),
    defaultDateFormat: z.string().default('YYYY-MM-DD_HH:mm:ss'),
    removeGpsMetadata: z.boolean().default(false),
    randomWordsNumAdjectives: z.number().default(3),
    randomWordsSeparator: z.string().default('-'),
    defaultCompressionFormat: z
      .enum(COMPRESS_TYPES)
      .default('jpg')
      .refine((v) => checkOutput(v), 'System does not support outputting this image format.'),
    maxFilesPerUpload: z.number().max(2147483647).min(1).default(1000),
    extensionlessUrls: z.boolean().default(false),
  }),
  urls: z.object({
    route: z.string().startsWith('/').min(1).trim().toLowerCase().default('/go'),
    length: z.number().default(6),
  }),
  datasource: z
    .object({
      type: z.enum(['local', 's3']).default('local'),
      s3: z
        .object({
          accessKeyId: z.string(),
          secretAccessKey: z.string(),
          region: z.string(),
          bucket: z.string(),
          endpoint: z.string().nullable().default(null),
          forcePathStyle: z.boolean().default(false),
          subdirectory: z.string().nullable().default(null),
        })
        .optional(),
      local: z
        .object({
          directory: z
            .string()
            .transform((s) => resolve(s))
            .default('./uploads'),
        })
        .optional()
        .default({ directory: './uploads' }),
    })
    .superRefine((s, c) => {
      if (s.type === 's3' && !s.s3) {
        for (const key of ['accessKeyId', 'secretAccessKey', 'region', 'bucket']) {
          c.addIssue({
            code: 'invalid_type',
            expected: 'string',
            received: 'unknown',
            path: ['s3', key],
          });
        }
      } else if (s.type === 'local' && !s.local) {
        c.addIssue({
          code: 'invalid_type',
          expected: 'string',
          received: 'unknown',
          path: ['local', 'directory'],
        });
      }
    }),
  features: z.object({
    imageCompression: z.boolean().default(true),
    robotsTxt: z.boolean().default(false),
    healthcheck: z.boolean().default(true),
    userRegistration: z.boolean().default(false),
    oauthRegistration: z.boolean().default(false),
    deleteOnMaxViews: z.boolean().default(true),
    thumbnails: z.object({
      enabled: z.boolean().default(true),
      num_threads: z.number().default(4),
      format: z.enum(['jpg', 'png', 'webp']).default('jpg'),
      instantaneous: z.boolean().default(false),
    }),
    metrics: z.object({
      enabled: z.boolean().default(true),
      adminOnly: z.boolean().default(false),
      showUserSpecific: z.boolean().default(true),
    }),
    versionChecking: z.boolean().default(true),
    versionAPI: z.url().default('https://zipline-version.diced.sh/'),
  }),
  domains: z.array(z.string()).default([]),
  invites: z.object({
    enabled: z.boolean().default(true),
    length: z.number().default(8),
  }),
  website: z.object({
    title: z.string().default('Zipline'),
    titleLogo: z.url().nullable().default(null),
    externalLinks: z
      .array(
        z.object({
          name: z.string(),
          url: z.url(),
        }),
      )
      .default([
        {
          name: 'GitHub',
          url: 'https://github.com/diced/zipline',
        },
        {
          name: 'Documentation',
          url: 'https://zipline.diced.sh',
        },
      ]),
    loginBackground: z.url().nullable().default(null),
    loginBackgroundBlur: z.boolean().default(true),
    defaultAvatar: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
    theme: z.object({
      default: z.string().default('system'),
      dark: z.string().default('builtin:dark_blue'),
      light: z.string().default('builtin:light_blue'),
    }),
    tos: z
      .string()
      .transform((s) => resolve(s))
      .refine((v) => (v ? v.endsWith('.md') : true))
      .nullable()
      .default(null),
  }),
  mfa: z.object({
    totp: z.object({
      enabled: z.boolean().default(false),
      issuer: z.string().default('Zipline'),
    }),
    passkeys: z.object({
      enabled: z.boolean().default(false),
      rpID: z
        .string()
        .trim()
        .refine(
          (v) => v.length === 0 || /^[a-zA-Z0-9.-]+$/.test(v),
          'RP ID can only contain letters, numbers, dots, and hyphens. Example: example.com, localhost, zipline.example.com.',
        )
        .transform((v) => (v.length > 0 ? v : null))
        .nullable()
        .default(null),
      origin: z
        .string()
        .trim()
        .refine(
          (v) => v.length === 0 || /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/.*)?$/.test(v),
          'Origin must be a valid URL starting with http:// or https://',
        )
        .transform((v) => (v.length > 0 ? v : null))
        .nullable()
        .default(null),
    }),
  }),
  oauth: z.object({
    bypassLocalLogin: z.boolean().default(false),
    loginOnly: z.boolean().default(false),
    discord: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.url().nullable().default(null),
        allowedIds: z.array(z.string()).default([]),
        deniedIds: z.array(z.string()).default([]),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          redirectUri: z.undefined(),
          allowedIds: z.undefined().or(z.array(z.string()).default([])),
          deniedIds: z.undefined().or(z.array(z.string()).default([])),
        }),
      ),
    github: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.url().nullable().default(null),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          redirectUri: z.undefined(),
        }),
      ),
    google: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.url().nullable().default(null),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          redirectUri: z.undefined(),
        }),
      ),
    oidc: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        authorizeUrl: z.url(),
        userinfoUrl: z.url(),
        tokenUrl: z.url(),
        redirectUri: z.url().nullable().default(null),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          authorizeUrl: z.undefined(),
          userinfoUrl: z.undefined(),
          tokenUrl: z.undefined(),
          redirectUri: z.undefined(),
        }),
      ),
  }),
  discord: z
    .object({
      webhookUrl: z.url().nullable().default(null),
      username: z.string().nullable().default(null),
      avatarUrl: z.url().nullable().default(null),
      onUpload: discordContent,
      onShorten: discordContent,
    })
    .nullable()
    .default(null),
  ratelimit: z.object({
    enabled: z.boolean().default(true),
    max: z.number().default(10),
    window: z
      .number()
      .nullable()
      .default(null)
      .refine((v) => (v ? v > 0 : true)),
    adminBypass: z.boolean().default(true),
    allowList: z.array(z.string()).default([]),
  }),
  httpWebhook: z.object({
    onUpload: z.url().nullable().default(null),
    onShorten: z.url().nullable().default(null),
  }),
  pwa: z.object({
    enabled: z.boolean().default(true),
    title: z.string().default('Zipline'),
    shortName: z.string().default('Zipline'),
    description: z.string().default('Zipline'),
    themeColor: z.string().default('#000000'),
    backgroundColor: z.string().default('#000000'),
  }),
});

export type Config = z.infer<typeof schema>;

const logger = log('config').c('validate');

export function validateConfigObject(env: ParsedConfig): Config {
  const building = !!process.env.ZIPLINE_BUILD;

  if (building) {
    logger.debug('building, skipping validation');
    // @ts-ignore
    return {};
  }

  const validated = schema.safeParse(env);
  if (!validated.success) {
    logger.error('There was an error while validating the environment.');

    for (const error of validated.error.issues) {
      handleError(error);
    }

    process.exit(1);
  }

  logger.debug('reloaded config');

  return validated.data;
}

function handleError(error: z.core.$ZodIssue, pathPrefix: PropertyKey[] = []) {
  logger.debug(JSON.stringify(error));

  if (error.code === 'invalid_union') {
    for (const unionError of error.errors) {
      for (const subError of unionError) {
        handleError(subError, error.path);
      }
    }

    return;
  }

  const path = prettifyPath(error.path, pathPrefix);

  logger.error(`${path}: ${error.message}`);
}

function prettifyPath(path: PropertyKey[], prefix: PropertyKey[] = []) {
  if (path[1] === 'externalLinks') {
    return `WEBSITE_EXTERNAL_LINKS[${String(path[2])}]`;
  }

  return (
    PROP_TO_ENV[
      (prefix.length > 0 ? prefix.join('.') + '.' : '') + <keyof typeof PROP_TO_ENV>path.join('.')
    ] ?? (prefix.length > 0 ? prefix.join('.') + '.' : '') + path.join('.')
  );
}
