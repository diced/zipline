import { readDbVars } from '@/lib/config/read/env';
import { log } from '@/lib/logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type ClientConfig } from 'pg';
import * as relations from './relations';
import * as schema from './schema';

const building = !!process.env.ZIPLINE_BUILD;
const logger = log('db');
const databaseSchema = { ...schema, ...relations };

export type Database = NodePgDatabase<typeof databaseSchema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

declare global {
  // eslint-disable-next-line no-var
  var __db__: Database | undefined;
  // eslint-disable-next-line no-var
  var __dbPool__: Pool | undefined;
}

export function getDatabaseUrl() {
  const vars = readDbVars();
  if (vars.DATABASE_URL) return vars.DATABASE_URL;

  const username = encodeURIComponent(vars.DATABASE_USERNAME);
  const password = encodeURIComponent(vars.DATABASE_PASSWORD);
  return `postgresql://${username}:${password}@${vars.DATABASE_HOST}:${vars.DATABASE_PORT}/${vars.DATABASE_NAME}`;
}

export function postgresConnectionConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  const configuredOptions = url.searchParams.get('options')?.trim();
  const timezoneOption = '-c timezone=UTC';

  // PostgreSQL timestamps are stored without a time zone. Keep every session in UTC so database
  // defaults and JavaScript Date parameters represent the same wall-clock value on every host.
  url.searchParams.set(
    'options',
    configuredOptions ? `${configuredOptions} ${timezoneOption}` : timezoneOption,
  );

  return { connectionString: url.toString() };
}

function queryLogger() {
  const value = process.env.ZIPLINE_DB_LOG;
  if (!value) return undefined;

  const levels = value.split(',').map((level) => level.trim().toLowerCase());
  if (value !== 'true' && !levels.includes('query')) return undefined;

  return {
    logQuery(query: string, params: unknown[]) {
      logger.debug('query', { query, params });
    },
  };
}

function createDatabase() {
  const connectionString = getDatabaseUrl();
  logger.info('connecting to database');

  const pool = new Pool(postgresConnectionConfig(connectionString));
  const db = drizzle({ client: pool, schema: databaseSchema, logger: queryLogger() });
  return { db, pool };
}

if (!building && (!globalThis.__db__ || !globalThis.__dbPool__)) {
  const created = createDatabase();
  globalThis.__db__ = created.db;
  globalThis.__dbPool__ = created.pool;
}

export const db = globalThis.__db__ as Database;
export const pool = globalThis.__dbPool__ as Pool;

export async function closeDatabase() {
  if (!globalThis.__dbPool__) return;

  const activePool = globalThis.__dbPool__;
  globalThis.__db__ = undefined;
  globalThis.__dbPool__ = undefined;
  await activePool.end();
}

export { databaseSchema };
