import { getDatabaseUrl, postgresConnectionConfig } from '@/lib/db';
import { isPostgresError } from '@/lib/db/utils';
import { log } from '@/lib/logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles, type MigrationConfig, type MigrationMeta } from 'drizzle-orm/migrator';
import { join } from 'node:path';
import { Client, escapeIdentifier } from 'pg';
import { assertCompletePrismaMigrationHistory, hasPrismaMigrationHistory } from './prisma-history';

const logger = log('migrations');
const advisoryLockName = 'zipline:drizzle-migrations';
const migrationsSchema = 'drizzle';
const migrationsTable = '__drizzle_migrations';
const migrationConfig = {
  migrationsFolder: join(process.cwd(), 'drizzle'),
  migrationsSchema,
  migrationsTable,
} satisfies MigrationConfig;

async function ensureDatabaseExists(connectionString: string) {
  const target = new Client(postgresConnectionConfig(connectionString));

  try {
    await target.connect();
    return false;
  } catch (error) {
    if (!isPostgresError(error, '3D000')) throw error;
  } finally {
    await target.end().catch(() => undefined);
  }

  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (!databaseName) throw new Error('DATABASE_URL does not contain a database name');

  url.pathname = '/postgres';
  const maintenance = new Client(postgresConnectionConfig(url.toString()));
  try {
    await maintenance.connect();
    await maintenance.query(`CREATE DATABASE ${escapeIdentifier(databaseName)}`);
    return true;
  } catch (error) {
    // Another replica may have created it after our initial connection attempt.
    if (isPostgresError(error, '42P04')) return false;
    throw error;
  } finally {
    await maintenance.end().catch(() => undefined);
  }
}

async function hasDrizzleMigrationHistory(client: Client) {
  const result = await client.query<{ exists: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS exists`, [
    `${migrationsSchema}.${migrationsTable}`,
  ]);
  if (!result.rows[0]?.exists) return false;

  const table = `${escapeIdentifier(migrationsSchema)}.${escapeIdentifier(migrationsTable)}`;
  const history = await client.query<{ exists: boolean }>(`SELECT EXISTS (SELECT FROM ${table}) AS exists`);
  return history.rows[0]?.exists === true;
}

async function createDrizzleMigrationTable(client: Client) {
  const schema = escapeIdentifier(migrationsSchema);
  const table = `${schema}.${escapeIdentifier(migrationsTable)}`;

  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint,
      name text,
      applied_at timestamp with time zone DEFAULT now()
    )
  `);
  await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS name text`);
  await client.query(
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone DEFAULT now()`,
  );
}

async function adoptPrismaDatabase(client: Client, baseline: MigrationMeta) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try {
    await assertCompletePrismaMigrationHistory(client);
    await createDrizzleMigrationTable(client);

    const hasMigrationHistory = await hasDrizzleMigrationHistory(client);
    if (hasMigrationHistory)
      throw new Error('Drizzle migration history appeared while preparing the Prisma baseline');

    const table = `${escapeIdentifier(migrationsSchema)}.${escapeIdentifier(migrationsTable)}`;
    await client.query(
      `INSERT INTO ${table} (hash, created_at, name, applied_at) VALUES ($1, $2, $3, NULL)`,
      [baseline.hash, baseline.folderMillis, baseline.name],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function acquireMigrationLock(client: Client) {
  await client.query(`SELECT pg_advisory_lock(hashtextextended($1, 0))`, [advisoryLockName]);
}

async function releaseMigrationLock(client: Client) {
  await client.query(`SELECT pg_advisory_unlock(hashtextextended($1, 0))`, [advisoryLockName]);
}

export async function runMigrations() {
  const connectionString = getDatabaseUrl();
  logger.debug('ensuring database exists');

  const databaseCreated = await ensureDatabaseExists(connectionString);
  if (databaseCreated) logger.info('database created');

  const migrations = readMigrationFiles(migrationConfig);
  const baseline = migrations[0];
  if (!baseline) throw new Error(`no Drizzle migrations found in ${migrationConfig.migrationsFolder}`);

  const client = new Client(postgresConnectionConfig(connectionString));
  let lockAcquired = false;

  try {
    await client.connect();
    await acquireMigrationLock(client);
    lockAcquired = true;

    const hasDrizzleHistory = await hasDrizzleMigrationHistory(client);
    const hasPrismaHistory = await hasPrismaMigrationHistory(client);

    if (!hasDrizzleHistory && hasPrismaHistory) {
      try {
        await adoptPrismaDatabase(client, baseline);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        throw new Error(
          `cannot safely migrate from prisma to drizzle: ${message}. To resolve this, repair the database with the previous (latest before this) Zipline release before upgrading; no baseline was recorded.`,
          { cause: error },
        );
      }
    }

    logger.debug('applying migrations');
    await migrate(drizzle({ client }), migrationConfig);
    logger.debug('migrations complete');
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    try {
      if (lockAcquired) await releaseMigrationLock(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
