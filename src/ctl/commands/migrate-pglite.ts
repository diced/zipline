import { getDatabaseUrl } from '@/lib/db/connection';
import { migratePostgresToPglite } from '@/lib/db/migration/import-postgres';
import { log } from '@/lib/logger';
import { pathToFileURL } from 'url';

const logger = log('migrate-pglite');

export async function migratePglite(directory: string, { source }: { source?: string }) {
  try {
    console.error(
      'Keep Zipline stopped until switching to PGlite: this copies a PostgreSQL snapshot, so later writes are not included.',
    );

    const destination = await migratePostgresToPglite({
      connectionString: source ?? getDatabaseUrl(),
      directory,
      onProgress: (table, rows) => console.error(`Copied ${table}: ${rows} rows`),
    });
    const url = pathToFileURL(destination).href.replace(/^file:/, 'pglite:');

    console.log(`PGlite database created at ${destination}`);
    console.log(`Set DATABASE_URL=${url}, then start Zipline.`);
  } catch (error) {
    logger.error(error instanceof Error ? error : String(error));

    if (error instanceof AggregateError) {
      for (const cause of error.errors) {
        logger.error(cause instanceof Error ? cause : String(cause));
      }
    }

    process.exit(1);
  }

  process.exit(0);
}
