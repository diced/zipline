import * as schema from '@/lib/db/schema';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdir, rm } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { Client, escapeIdentifier } from 'pg';

const tables = Object.values(schema)
  .filter((table) => is(table, PgTable))
  .map((table) => getTableConfig(table));

async function copyTable(source: Client, target: Transaction, table: ReturnType<typeof getTableConfig>) {
  const name = `public.${escapeIdentifier(table.name)}`;
  const columns = table.columns.map((column) => escapeIdentifier(column.name));
  const values = columns.map((column) => `quote_nullable(${column}::text)`).join(', ');

  // Let PostgreSQL quote values to preserve bigint, JSON, timestamps, and arrays exactly.
  await source.query(
    `
      DECLARE zipline_import_cursor NO SCROLL CURSOR FOR
      SELECT $1::text || array_to_string(ARRAY[${values}], ', ') || ');' AS statement
      FROM ${name}
    `,
    [`INSERT INTO ${name} (${columns.join(', ')}) VALUES (`],
  );

  let count = 0;
  while (true) {
    const { rows } = await source.query<{ statement: string }>(
      'FETCH FORWARD 250 FROM zipline_import_cursor',
    );
    if (!rows.length) break;

    await target.exec(rows.map((row) => row.statement).join('\n'));
    count += rows.length;
  }

  await source.query('CLOSE zipline_import_cursor');
  return count;
}

export async function migratePostgresToPglite({
  connectionString,
  directory,
  onProgress,
}: {
  connectionString: string;
  directory: string;
  onProgress?: (table: string, rows: number) => void;
}) {
  if (!['postgres:', 'postgresql:'].includes(new URL(connectionString).protocol))
    throw new Error('invalid connection string');

  const destination = resolve(directory);
  const source = new Client({ connectionString });

  await mkdir(dirname(destination), { recursive: true });
  await mkdir(destination);

  try {
    await source.connect();
    await source.query(`
      BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
      SET LOCAL DateStyle = 'ISO, YMD';
      SET LOCAL TimeZone = 'UTC';
      SET LOCAL row_security = off;
    `);

    const target = new PGlite(destination);
    try {
      await migrate(drizzle({ client: target }), { migrationsFolder: join(process.cwd(), 'drizzle') });

      const constraints = tables.flatMap((table) =>
        table.foreignKeys.map(
          (key) =>
            `ALTER TABLE public.${escapeIdentifier(table.name)} ALTER CONSTRAINT ${escapeIdentifier(key.getName())}`,
        ),
      );

      await target.transaction(async (tx) => {
        for (const constraint of constraints) await tx.exec(`${constraint} DEFERRABLE INITIALLY DEFERRED`);
        for (const table of tables) {
          const count = await copyTable(source, tx, table);
          onProgress?.(table.name, count);
        }

        await tx.exec('SET CONSTRAINTS ALL IMMEDIATE');
        for (const constraint of constraints) await tx.exec(`${constraint} NOT DEFERRABLE`);
      });

      return destination;
    } finally {
      await target.close();
    }
  } catch (error) {
    await rm(destination, { recursive: true, force: true });

    throw error;
  } finally {
    await source.end().catch(() => undefined);
  }
}
