import { readDbVars } from '@/lib/config/read/env';
import { log } from '@/lib/logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { relations } from './relations';

const building = !!process.env.ZIPLINE_BUILD;
const logger = log('db');

type Database = NodePgDatabase<typeof relations>;
type Transaction = NodePgTransaction<typeof relations>;
export type DbClient = Database | Transaction;

declare global {
  // eslint-disable-next-line no-var
  var __db__: Database | undefined;
}

export function getDatabaseUrl() {
  const vars = readDbVars();
  if (vars.DATABASE_URL) return vars.DATABASE_URL;

  const username = encodeURIComponent(vars.DATABASE_USERNAME);
  const password = encodeURIComponent(vars.DATABASE_PASSWORD);
  return `postgresql://${username}:${password}@${vars.DATABASE_HOST}:${vars.DATABASE_PORT}/${vars.DATABASE_NAME}`;
}

function queryLogger() {
  if (!process.env.ZIPLINE_DB_LOG) return undefined;

  return {
    logQuery(query: string, params: unknown[]) {
      logger.debug('query', { query, params });
    },
  };
}

function createDatabase() {
  const connectionString = getDatabaseUrl();
  logger.info('connecting to database');

  return drizzle({
    connection: connectionString,
    relations,
    logger: queryLogger(),
  });
}

export const db: Database = building ? drizzle.mock({ relations }) : (globalThis.__db__ ??= createDatabase());
