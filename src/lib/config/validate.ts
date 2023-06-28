import { ZodError, z } from 'zod';
import { PROP_TO_ENV, ParsedEnv } from './read';
import { log } from '../logger';

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
  }),
  files: z.object({
    route: z.string().default('u'),
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
