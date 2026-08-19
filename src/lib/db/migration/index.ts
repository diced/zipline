import { getDatabaseUrl, postgresConnectionConfig } from '@/lib/db';
import { log } from '@/lib/logger';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator';
import { join } from 'node:path';
import { Client } from 'pg';
import { assertPrismaBaselineCatalog, baselineTableNames } from './catalog';
import { assertCompletePrismaMigrationHistory, hasPrismaMigrationHistory } from './prisma-history';

const logger = log('migrations');
const advisoryLockName = 'zipline:drizzle-migrations';
const migrationsFolder = join(process.cwd(), 'drizzle');

type NativeMigrationRow = {
  hash: string;
  created_at: string;
};

function postgresErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return String(error.code);
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function ensureDatabaseExists(connectionString: string) {
  const target = new Client(postgresConnectionConfig(connectionString));

  try {
    await target.connect();
    return false;
  } catch (error) {
    if (postgresErrorCode(error) !== '3D000') throw error;
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
    await maintenance.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    return true;
  } catch (error) {
    // Another replica may have created it after our initial connection attempt.
    if (postgresErrorCode(error) === '42P04') return false;
    throw error;
  } finally {
    await maintenance.end().catch(() => undefined);
  }
}

async function nativeMigrationTableExists(client: Client) {
  const result = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists`,
  );
  return result.rows[0]?.exists === true;
}

async function readNativeMigrationHistory(client: Client) {
  if (!(await nativeMigrationTableExists(client))) return [];

  const result = await client.query<NativeMigrationRow>(`
    SELECT hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at, id
  `);
  return result.rows;
}

function assertKnownNativeMigrationHistory(rows: NativeMigrationRow[], migrations: MigrationMeta[]) {
  if (rows.length > migrations.length) {
    throw new Error(
      `Drizzle migration history contains ${rows.length - migrations.length} unknown migration(s)`,
    );
  }

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const expected = migrations[index];
    if (!expected || Number(row.created_at) !== expected.folderMillis || row.hash !== expected.hash) {
      throw new Error(`Drizzle migration history is unknown or has been modified at entry ${index + 1}`);
    }
  }
}

async function hasBaselineTables(client: Client) {
  const result = await client.query<{ count: string }>(
    `
      SELECT count(*)::text AS count
      FROM pg_catalog.pg_class AS table_class
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = table_class.relnamespace
      WHERE namespace.nspname = 'public'
        AND table_class.relkind = 'r'
        AND table_class.relname = ANY($1::text[])
    `,
    [baselineTableNames],
  );
  return Number(result.rows[0]?.count ?? 0) > 0;
}

async function createNativeMigrationTable(client: Client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function baselinePrismaDatabase(client: Client, baseline: MigrationMeta) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try {
    await assertCompletePrismaMigrationHistory(client);
    await assertPrismaBaselineCatalog(client);
    await createNativeMigrationTable(client);

    const existing = await readNativeMigrationHistory(client);
    if (existing.length) {
      throw new Error('Drizzle migration history appeared while preparing the Prisma baseline');
    }

    await client.query(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`, [
      baseline.hash,
      baseline.folderMillis,
    ]);
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

  if (await ensureDatabaseExists(connectionString)) logger.info('database created');

  const migrations = readMigrationFiles({ migrationsFolder });
  const baseline = migrations[0];
  if (!baseline) throw new Error(`no Drizzle migrations found in ${migrationsFolder}`);

  const client = new Client(postgresConnectionConfig(connectionString));
  let lockAcquired = false;

  try {
    await client.connect();
    await acquireMigrationLock(client);
    lockAcquired = true;

    const nativeHistory = await readNativeMigrationHistory(client);
    assertKnownNativeMigrationHistory(nativeHistory, migrations);

    if (!nativeHistory.length) {
      if (await hasPrismaMigrationHistory(client)) {
        logger.info('validating existing Prisma database before Drizzle handoff');
        try {
          await baselinePrismaDatabase(client, baseline);
        } catch (error) {
          throw new Error(
            `cannot safely hand off this Prisma database to Drizzle: ${(error as Error).message}. ` +
              'Repair it with the previous Zipline release before upgrading; no baseline was recorded.',
            { cause: error },
          );
        }
        logger.info('existing Prisma database recorded at the Drizzle baseline');
      } else if (await hasBaselineTables(client)) {
        throw new Error(
          'database contains Zipline tables but no recognized Prisma or Drizzle migration history; refusing to guess its state',
        );
      }
    }

    const historyBeforeMigrate = await readNativeMigrationHistory(client);
    logger.debug('applying Drizzle migrations');
    await migrate(drizzle(client), { migrationsFolder });

    const updatedHistory = await readNativeMigrationHistory(client);
    assertKnownNativeMigrationHistory(updatedHistory, migrations);
    if (updatedHistory.length === historyBeforeMigrate.length) logger.debug('no migrations applied');
    else logger.info(`applied ${updatedHistory.length - historyBeforeMigrate.length} migration(s)`);
  } catch (error) {
    logger.error(error as Error);
    throw error;
  } finally {
    try {
      if (lockAcquired) await releaseMigrationLock(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
