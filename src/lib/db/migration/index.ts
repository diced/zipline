import { db } from '@/lib/db';
import { getDatabaseUrl, getPgliteDir } from '@/lib/db/connection';
import { isPostgresError } from '@/lib/db/utils';
import { log } from '@/lib/logger';
import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { migrate as migrateEmbedded } from 'drizzle-orm/pg-core';
import { join } from 'path';
import { Client, escapeIdentifier } from 'pg';
import { assertCompletePrismaMigrationHistory, hasPrismaMigrationHistory } from './prisma-history';

const logger = log('migrations');
const advisoryLockName = 'zipline:drizzle-migrations';
const migrationTable = 'drizzle.__drizzle_migrations';
const migrationConfig = { migrationsFolder: join(process.cwd(), 'drizzle') };

async function ensureDatabaseExists(connectionString: string) {
  const target = new Client({ connectionString });

  try {
    await target.connect();
    return false;
  } catch (error) {
    if (!isPostgresError(error, '3D000')) throw error;
  } finally {
    await target.end().catch(() => undefined);
  }

  const url = new URL(connectionString);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!name) throw new Error('DATABASE_URL does not contain a database name');

  url.pathname = '/postgres';
  const maintenance = new Client({ connectionString: url.toString() });
  try {
    await maintenance.connect();
    await maintenance.query(`CREATE DATABASE ${escapeIdentifier(name)}`);

    return true;
  } catch (error) {
    if (isPostgresError(error, '42P04') || isPostgresError(error, '23505')) return false;

    throw error;
  } finally {
    await maintenance.end().catch(() => undefined);
  }
}

async function hasDrizzleMigrationHistory(client: Client) {
  const result = await client.query<{ exists: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS exists`, [
    migrationTable,
  ]);
  if (!result.rows[0]?.exists) return false;

  const history = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT FROM ${migrationTable}) AS exists`,
  );
  return history.rows[0]?.exists === true;
}

async function prepareDrizzleMigrationTable(client: Client) {
  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${migrationTable} (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint,
      name text,
      applied_at timestamp with time zone DEFAULT now()
    )
  `);

  await client.query(`ALTER TABLE ${migrationTable} ADD COLUMN IF NOT EXISTS name text`);
  await client.query(
    `ALTER TABLE ${migrationTable} ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone DEFAULT now()`,
  );
}

async function adoptPrismaDatabase(client: Client, baseline: MigrationMeta) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try {
    await assertCompletePrismaMigrationHistory(client);
    await prepareDrizzleMigrationTable(client);

    const hasMigrationHistory = await hasDrizzleMigrationHistory(client);
    if (hasMigrationHistory)
      throw new Error('Drizzle migration history appeared while preparing the Prisma baseline');

    await client.query(
      `INSERT INTO ${migrationTable} (hash, created_at, name, applied_at) VALUES ($1, $2, $3, NULL)`,
      [baseline.hash, baseline.folderMillis, baseline.name],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `cannot safely migrate from prisma to drizzle: ${message}. To resolve this, repair the database with the previous (latest before this) Zipline release before upgrading; no baseline was recorded.`,
      { cause: error },
    );
  }
}

export async function runMigrations() {
  const connectionString = getDatabaseUrl();
  if (getPgliteDir(connectionString)) {
    try {
      return await migrateEmbedded(readMigrationFiles(migrationConfig), db, migrationConfig);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  logger.debug('ensuring database exists');

  const dbCreated = await ensureDatabaseExists(connectionString);
  if (dbCreated) logger.info('database created');

  const migrations = readMigrationFiles(migrationConfig);
  const baseline = migrations[0];
  if (!baseline) throw new Error(`no Drizzle migrations found in ${migrationConfig.migrationsFolder}`);

  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query(`SELECT pg_advisory_lock(hashtextextended($1, 0))`, [advisoryLockName]);

    const hasDrizzleHistory = await hasDrizzleMigrationHistory(client);
    if (!hasDrizzleHistory) {
      const hasPrismaHistory = await hasPrismaMigrationHistory(client);
      if (hasPrismaHistory) await adoptPrismaDatabase(client, baseline);
    }

    logger.debug('applying migrations');
    await migrate(drizzle({ client }), migrationConfig);
    logger.debug('migrations complete');
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}
