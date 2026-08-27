import { datasource } from '../datasource';
import { db } from '../db';
import { removeFile } from '../db/models/file';
import { files } from '../db/schema';
import { log } from '../logger';
import { eq } from 'drizzle-orm';

const logger = log('serverutil').c('requerySize');

export async function requerySize({
  forceDelete,
  forceUpdate,
}: {
  forceDelete?: boolean;
  forceUpdate?: boolean;
}): Promise<string> {
  logger.info('preparing to requery size of all files', { forceDelete, forceUpdate });

  const rows = await db
    .select({ id: files.id, name: files.name })
    .from(files)
    .where(forceUpdate ? undefined : eq(files.size, 0));
  logger.info('found files to requery size', { count: rows.length });

  let notFound = false;

  for (let i = 0; i !== rows.length; ++i) {
    const file = rows[i];

    if (!(await datasource.get(file.name))) {
      if (forceDelete) {
        logger.info("deleting file from database because it's not in the datasource", {
          id: file.id,
          name: file.name,
        });

        await removeFile(file.id);
        continue;
      }

      notFound = true;
      continue;
    }

    const size = await datasource.size(file.name);
    if (size === 0) {
      logger.info('file has a size of 0 bytes', { id: file.id, name: file.name });
    } else {
      logger.info('file has a size', { id: file.id, name: file.name, size });
      await db.update(files).set({ size }).where(eq(files.id, file.id));
    }
  }

  const message = notFound
    ? 'At least one file did not exist within the datasource but was on the database, re run the script with the force delete option on to remove these files.'
    : 'Finished requerying all files.';

  logger.info(message);
  return message;
}
