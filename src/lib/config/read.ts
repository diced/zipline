import { log } from 'src/lib/logger';
import { parseEnv } from 'znv';
import { z } from 'zod';

const logger = log('config').c('read');

export function readEnv() {
  logger.debug('reading env');

  const validation = parseEnv(process.env, {
    PORT: z.number().default(3000),
    SESSION_SECRET: z.string(),
    DATABASE_URL: z.string(),

    FILES_ROUTE: z.string().default('u'),
  });

  logger.debug('env read', JSON.stringify(validation));

  return validation;
}

export type ValidatedEnv = ReturnType<typeof readEnv>;
