import { ZodError, ZodIssue, z } from 'zod';
import { PROP_TO_ENV, ParsedEnv } from './read';
import { log } from '../logger';
import { resolve } from 'path';

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
  }),
  files: z.object({
    route: z.string().startsWith('/').nonempty().trim().toLowerCase().default('/u'),
    length: z.number().default(6),
    defaultFormat: z.enum(['random', 'date', 'uuid', 'name', 'gfycat']).default('random'),
    disabledExtensions: z.array(z.string()).default([]),
    maxFileSize: z.number().default(bytes('100mb')),
    defaultExpiration: z.number().nullable().default(null),
    assumeMimetypes: z.boolean().default(false),
    defaultDateFormat: z.string().default('YYYY-MM-DD_HH:mm:ss'),
  }),
  urls: z.object({
    route: z.string().startsWith('/').nonempty().trim().toLowerCase().default('/go'),
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
          directory: z.string().transform((s) => resolve(s)),
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
    thumbnails: z.boolean().default(true),
    imageCompression: z.boolean().default(true),
    robotsTxt: z.boolean().default(false),
    healthcheck: z.boolean().default(true),
    invites: z.boolean().default(true),
    userRegistration: z.boolean().default(false),
    oauthRegistration: z.boolean().default(false),
    deleteOnMaxViews: z.boolean().default(true),
  }),
  website: z.object({
    title: z.string().default('Zipline'),
    externalLinks: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
        })
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
    defaultAvatar: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
    disableMediaPreview: z.boolean().default(false),
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
        })
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
        })
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
        })
      ),
    authentik: z
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
        })
      ),
  }),
});

export type Config = z.infer<typeof schema>;

const logger = log('config').c('validate');

export function validateEnv(env: ParsedEnv): Config {
  try {
    const validated = schema.parse(env);

    if (!validated) {
      logger.error('There was an error while validating the environment.');
      process.exit(1);
    }

    logger.debug(`environment validated: ${JSON.stringify(validated)}`);

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
      : PROP_TO_ENV[error.path.join('.')] ?? error.path.join('.');

  logger.error(`${path}: ${error.message}`);
}
