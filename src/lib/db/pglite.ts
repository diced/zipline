import { PGlite } from '@electric-sql/pglite';
import { PGlite as PGlitePg17 } from '@electric-sql/pglite-pg17';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { log } from '@/lib/logger';

const logger = log('db').c('pglite');
export const PGLITE_POINTER = '.zipline-pglite.json';

export function getPgliteDataDirectory(directory: string): string {
  let contents: string;
  try {
    contents = readFileSync(join(directory, PGLITE_POINTER), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return directory;
    throw error;
  }

  const pointer = JSON.parse(contents);
  if (typeof pointer?.directory !== 'string' || !/^\.zipline-pglite-[a-zA-Z0-9]+$/.test(pointer.directory))
    throw new Error(`Invalid PGlite database pointer in ${directory}`);

  const active = join(directory, pointer.directory);
  readFileSync(join(active, 'PG_VERSION'), 'utf8');

  return active;
}

// interesting workaround to use both pglite with pg17 and pg18
export function createPglite(directory: string): PGlite {
  directory = getPgliteDataDirectory(directory);
  let version: string | undefined;

  try {
    version = readFileSync(join(directory, 'PG_VERSION'), 'utf8').trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;

    try {
      if (readdirSync(directory).length) {
        throw new Error(`PGlite directory ${directory} is not empty but has no PG_VERSION file`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  switch (version) {
    case undefined:
    case '18':
      return new PGlite(directory);
    case '17':
      logger.warn(
        'using the legacy pglite engine, support will be removed in a future release, stop zipline and run ziplinectl upgrade-pglite before restarting',
      );
      return new PGlitePg17(directory) as unknown as PGlite;
    default:
      throw new Error(`Unsupported PGlite database version ${JSON.stringify(version)} in ${directory}`);
  }
}
