import { buildDatabaseUrl, readDbVars } from '@/lib/config/read/env';
import { log } from '@/lib/logger';
import { fileURLToPath } from 'url';

const logger = log('db').c('pglite');

export function getDatabaseUrl() {
  const vars = readDbVars();
  if (vars.DATABASE_URL) return vars.DATABASE_URL;

  return buildDatabaseUrl(
    vars.DATABASE_USERNAME,
    vars.DATABASE_PASSWORD,
    vars.DATABASE_HOST,
    vars.DATABASE_PORT,
    vars.DATABASE_NAME,
  );
}

export function getPgliteDir(connectionString: string) {
  if (!connectionString.startsWith('pglite:')) return undefined;

  try {
    const url = new URL(connectionString);
    if (url.host || url.username || url.password || url.search || url.hash || !url.pathname.startsWith('/')) {
      logger.error('invalid: pglite:///abs/path');
      process.exit(1);
    }

    const directory = fileURLToPath(`file://${url.pathname}`);
    if (directory === '/') {
      logger.error('invalid root directory');
      process.exit(1);
    }

    return directory;
  } catch {
    logger.error('invalid: pglite:///abs/path');
    process.exit(1);
  }
}
