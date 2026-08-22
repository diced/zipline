import { datasource } from '../datasource';
import { db } from '../db';
import { removeFiles } from '../db/models/file';
import { files } from '../db/schema';
import { log } from '../logger';
import { eq } from 'drizzle-orm';

const logger = log('serverutil').c('clearZeros');

export async function clearZerosFiles(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: files.id, name: files.name }).from(files).where(eq(files.size, 0));
}

export async function clearZeros(zeroFiles: Awaited<ReturnType<typeof clearZerosFiles>>): Promise<string> {
  logger.info('preparing to clear files with a size of 0', { count: zeroFiles.length });

  const count = await removeFiles(zeroFiles.map((file) => file.id));

  logger.info('cleared files from the database with a size of 0', { count });

  for (let i = 0; i !== zeroFiles.length; ++i) {
    const file = zeroFiles[i];
    await datasource.delete(file.name);
    logger.info('deleted file from datasource', { id: file.id, name: file.name });
  }

  return `Cleared ${count} files with a size of 0.`;
}
