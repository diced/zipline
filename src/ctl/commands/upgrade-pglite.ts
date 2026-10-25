import { getDatabaseUrl } from '@/lib/db/connection';
import { upgradePgliteDatabase } from '@/lib/db/migration/upgrade-pglite';
import { log } from '@/lib/logger';

const logger = log('upgrade-pglite');

export async function upgradePglite({ source }: { source?: string }) {
  try {
    console.error(
      'Keep Zipline stopped while upgrading PGlite. The original database files will be retained as a backup.',
    );

    const result = await upgradePgliteDatabase(source ?? getDatabaseUrl());

    if (result.upgraded) {
      console.log('PGlite upgraded successfully. Restart Zipline with the same DATABASE_URL.');
      console.log(`Original database files retained at ${result.backup}`);
    } else {
      console.log(`PGlite already uses PostgreSQL ${result.targetVersion}; no upgrade is needed.`);
    }
  } catch (error) {
    let cause = error;
    while (cause instanceof Error) {
      logger.error(cause.message);
      cause = cause.cause;
    }
    if (!(error instanceof Error)) logger.error(String(error));
    process.exit(1);
  }

  process.exit(0);
}
