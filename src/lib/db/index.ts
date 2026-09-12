import { log } from '@/lib/logger';
import { drizzle, type NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgAsyncDatabase, PgAsyncTransaction } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite, type PgliteQueryResultHKT } from 'drizzle-orm/pglite';
import { getDatabaseUrl, getPgliteDir } from './connection';
import { relations } from './relations';

const building = !!process.env.ZIPLINE_BUILD;
const logger = log('db');

type QueryResult = NodePgQueryResultHKT | PgliteQueryResultHKT;
type Database = PgAsyncDatabase<QueryResult, typeof relations>;
type Transaction = PgAsyncTransaction<QueryResult, typeof relations>;
export type DbClient = Database | Transaction;

declare global {
  // eslint-disable-next-line no-var
  var __db__: Database | undefined;
}

function queryLogger() {
  if (!process.env.ZIPLINE_DB_LOG) return undefined;

  return {
    logQuery(query: string, params: unknown[]) {
      logger.debug('query', { query, params });
    },
  };
}

function createDatabase(): Database {
  const connectionString = getDatabaseUrl();
  const directory = getPgliteDir(connectionString);
  logger.info('connecting to database');

  return directory
    ? drizzlePglite({ connection: directory, relations, logger: queryLogger() })
    : drizzle({ connection: connectionString, relations, logger: queryLogger() });
}

export const db: Database = new Proxy(drizzle.mock({ relations }), {
  get(mock, property) {
    const database = building ? mock : (globalThis.__db__ ??= createDatabase());
    const value = Reflect.get(database, property, database);
    return typeof value === 'function' ? value.bind(database) : value;
  },
});
