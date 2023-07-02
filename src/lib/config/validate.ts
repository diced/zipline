import { ZodError, z } from 'zod';
import { PROP_TO_ENV, ParsedEnv } from './read';
import { log } from '../logger';
import { resolve } from 'path';
import bytes from 'bytes';

const schema = z.object({
  core: z.object({
    port: z.number().default(3000),
    hostname: z.string().default('localhost'),
    secret: z.string().superRefine((s, c) => {
      if (s === 'changethis')
        return c.addIssue({
          code: 'custom',
          message: 'Secret must be changed from the default value',
          path: ['core', 'secret'],
        });

      if (s.length <= 16) {
        return c.addIssue({
          code: 'too_small',
          minimum: 16,
          type: 'string',
          inclusive: true,
          message: 'Secret must contain at least 16 characters',
          path: ['core', 'secret'],
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
    defaultExpiration: z.number().nullish(),
    assumeMimetypes: z.boolean().default(false),
    defaultDateFormat: z.string().default('YYYY-MM-DD_HH:mm:ss'),
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
});

export type Config = z.infer<typeof schema>;

export function validateEnv(env: ParsedEnv): Config {
  const logger = log('config').c('validate');

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

      for (let i = 0; i !== e.errors.length; ++i) {
        const error = e.errors[i];
        logger.debug(JSON.stringify(error));

        const path = PROP_TO_ENV[error.path.join('.')];

        logger.error(`${path}: ${error.message}`);
      }

      process.exit(1);
    }

    throw e;
  }
}
