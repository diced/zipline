import { ZodError, ZodIssue, z } from 'zod';
import { PROP_TO_ENV, ParsedConfig } from './read';
import { log } from '../logger';
import { join, resolve } from 'path';
import { bytes } from '../bytes';
import ms from 'ms';
import { tmpdir } from 'os';

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

export const discordContent = z
  .object({
    webhookUrl: z.string().url().nullable().default(null),
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
    hostname: z.string().default('localhost'),
    secret: z.string().superRefine((s, c) => {
      if (s === 'changethis')
        return c.addIssue({
          code: 'custom',
          message: 'Secret must be changed from the default value',
        });

      if (s.length <= 16) {
        return c.addIssue({
          code: 'too_small',
          minimum: 16,
          type: 'string',
          inclusive: true,
          message: 'Secret must contain at least 16 characters',
          exact: false,
        });
      }
    }),
    databaseUrl: z.string().url(),
    returnHttpsUrls: z.boolean().default(false),
    defaultDomain: z.string().nullable().default(null),
    tempDirectory: z
      .string()
      .transform((s) => resolve(s))
      .default(join(tmpdir(), 'zipline')),
  }),
  chunks: z.object({
    max: z.number().default(bytes('95mb')),
    size: z.number().default(bytes('25mb')),
    enabled: z.boolean().default(true),
  }),
  tasks: z.object({
    deleteInterval: z.number().default(ms('30min')),
    clearInvitesInterval: z.number().default(ms('30min')),
    maxViewsInterval: z.number().default(ms('30min')),
    thumbnailsInterval: z.number().default(ms('30min')),
    metricsInterval: z.number().default(ms('30min')),
  }),
  files: z.object({
    route: z.string().startsWith('/').min(1).trim().toLowerCase().default('/u'),
    length: z.number().default(6),
    defaultFormat: z.enum(['random', 'date', 'uuid', 'name', 'gfycat']).default('random'),
    disabledExtensions: z.array(z.string()).default([]),
    maxFileSize: z.number().default(bytes('100mb')),
    defaultExpiration: z.number().nullable().default(null),
    assumeMimetypes: z.boolean().default(false),
    defaultDateFormat: z.string().default('YYYY-MM-DD_HH:mm:ss'),
    removeGpsMetadata: z.boolean().default(false),
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
        })
        .optional(),
      local: z
        .object({
          directory: z
            .string()
            .transform((s) => resolve(s))
            .default('./uploads'),
        })
        .optional(),
    })
    .superRefine((s, c) => {
      if (s.type === 's3' && !s.s3) {
        for (const key of ['accessKeyId', 'secretAccessKey', 'region', 'bucket']) {
          c.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: 'unknown',
            path: ['s3', key],
          });
        }
      } else if (s.type === 'local' && !s.local) {
        c.addIssue({
          code: z.ZodIssueCode.invalid_type,
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
    }),
    metrics: z.object({
      enabled: z.boolean().default(true),
      adminOnly: z.boolean().default(false),
      showUserSpecific: z.boolean().default(true),
    }),
  }),
  invites: z.object({
    enabled: z.boolean().default(true),
    length: z.number().default(8),
  }),
  website: z.object({
    title: z.string().default('Zipline'),
    titleLogo: z.string().url().nullable().default(null),
    externalLinks: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
        }),
      )
      .default([
        {
          name: 'GitHub',
          url: 'https://github.com/diced/zipline',
        },
        {
          name: 'Documentation',
          url: 'https://zipline.diced.tech',
        },
      ]),
    loginBackground: z.string().url().nullable().default(null),
    defaultAvatar: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
    theme: z.object({
      default: z.string().default('system'),
      dark: z.string().default('builtin:dark_gray'),
      light: z.string().default('builtin:light_gray'),
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
    passkeys: z.boolean().default(true),
  }),
  oauth: z.object({
    bypassLocalLogin: z.boolean().default(false),
    loginOnly: z.boolean().default(false),
    discord: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
        }),
      ),
    github: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
        }),
      ),
    google: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
        }),
      ),
    oidc: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        authorizeUrl: z.string().url(),
        userinfoUrl: z.string().url(),
        tokenUrl: z.string().url(),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          authorizeUrl: z.undefined(),
          userinfoUrl: z.undefined(),
          tokenUrl: z.undefined(),
        }),
      ),
  }),
  discord: z
    .object({
      webhookUrl: z.string().url().nullable().default(null),
      username: z.string().nullable().default(null),
      avatarUrl: z.string().url().nullable().default(null),
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
    onUpload: z.string().url().nullable().default(null),
    onShorten: z.string().url().nullable().default(null),
  }),
  ssl: z.object({
    key: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
    cert: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
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

  try {
    const validated = schema.parse(env);

    if (!validated) {
      logger.error('There was an error while validating the environment.');
      process.exit(1);
    }

    logger.debug('reloaded config');

    return validated;
  } catch (e) {
    if (e instanceof ZodError) {
      logger.error(`There were ${e.errors.length} error(s) while validating the environment.`);

      for (const error of e.errors) {
        handleError(error);
      }

      process.exit(1);
    }

    throw e;
  }
}

function handleError(error: ZodIssue) {
  logger.debug(JSON.stringify(error));

  if (error.code === 'invalid_union') {
    for (const unionError of error.unionErrors) {
      for (const subError of unionError.issues) {
        handleError(subError);
      }
    }

    return;
  }

  const path =
    error.path[1] === 'externalLinks'
      ? `WEBSITE_EXTERNAL_LINKS[${error.path[2]}]`
      : PROP_TO_ENV[<keyof typeof PROP_TO_ENV>error.path.join('.')] ?? error.path.join('.');

  logger.error(`${path}: ${error.message}`);
}
