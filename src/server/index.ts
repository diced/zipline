import { validateEnv } from '@/lib/config/validate';
import { readEnv } from '@/lib/config/read';
import { createToken, decryptToken, encryptToken } from '@/lib/crypto';
import { runMigrations } from '@/lib/db/migration';
import { log } from '@/lib/logger';
import express from 'express';
import next from 'next';
import { parse } from 'url';
import { mkdir } from 'fs/promises';

const MODE = process.env.NODE_ENV || 'production';

const logger = log('server');

async function main() {
  logger.info(`starting zipline in ${MODE} mode`);

  const server = express();

  logger.info('reading environment for configuration');
  const config = validateEnv(readEnv());

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local!.directory, { recursive: true });
  }

  process.env.DATABASE_URL = config.core.databaseUrl;

  await runMigrations();

  server.disable('x-powered-by');
  server.use(express.static('public', { maxAge: '1h' }));

  const app = next({
    dev: MODE === 'development',
    quiet: MODE === 'production',
    hostname: config.core.hostname,
    port: config.core.port,
    dir: '.',
  });
  const handle = app.getRequestHandler();

  await app.prepare();

  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  server.listen(config.core.port, config.core.hostname, () => {
    logger.info(`server listening on port ${config.core.port}`);
  });
}

main();
