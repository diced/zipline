import { readDbVars } from '@/lib/config/read/env';
import { log } from '@/lib/logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type ClientConfig } from 'pg';
import { relations } from './relations';

const building = !!process.env.ZIPLINE_BUILD;
const logger = log('db');
export type Database = NodePgDatabase<typeof relations>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbClient = Database | Transaction;

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
  const db = drizzle({ client: pool, relations, logger: queryLogger() });
  return { db, pool };
}

if (!building && (!globalThis.__db__ || !globalThis.__dbPool__)) {
  const created = createDatabase();
  globalThis.__db__ = created.db;
  globalThis.__dbPool__ = created.pool;
}

export const db = globalThis.__db__ as Database;
