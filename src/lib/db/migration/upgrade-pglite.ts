import { getPgliteDir } from '@/lib/db/connection';
import { createPglite, getPgliteDataDirectory, PGLITE_POINTER } from '@/lib/db/pglite';
import { PGlite } from '@electric-sql/pglite';
import { pgDump } from '@electric-sql/pglite-tools/pg_dump';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { mkdtemp, readFile, realpath, rename, rm, writeFile } from 'fs/promises';
import { basename, join } from 'path';

export async function upgradePgliteDatabase(connectionString: string) {
  const confDir = getPgliteDir(connectionString);
  if (!confDir) throw new Error('The source must be a pglite:///absolute/path URL');

  const dir = await realpath(confDir);
  const srcDir = getPgliteDataDirectory(dir);
  const srcVersion = (await readFile(join(srcDir, 'PG_VERSION'), 'utf8')).trim();
  const dest = await mkdtemp(join(dir, '.zipline-pglite-'));
  const ptr = join(dest, PGLITE_POINTER);
  let switched = false;

  try {
    const target = new PGlite(dest);
    try {
      await target.waitReady;
      const targetVersion = (await readFile(join(dest, 'PG_VERSION'), 'utf8')).trim();
      if (srcVersion === targetVersion) return { upgraded: false, targetVersion };

      const source = createPglite(srcDir);
      let dump: File;
      try {
        dump = await pgDump({ pg: source });
      } finally {
        await source.close();
      }

      await target.exec(await dump.text());
      await target.exec('RESET search_path');
      await migrate(drizzle({ client: target }), { migrationsFolder: join(process.cwd(), 'drizzle') });
    } finally {
      await target.close();
    }

    await writeFile(ptr, JSON.stringify({ directory: basename(dest) }), {
      flag: 'wx',
      mode: 0o600,
      flush: true,
    });

    await rename(ptr, join(dir, PGLITE_POINTER));

    switched = true;
    return { upgraded: true, backup: srcDir };
  } finally {
    if (!switched) await rm(dest, { recursive: true, force: true });
  }
}
