import { datasource } from '../datasource';
import { listFileRows, deleteFilesByIds } from '../db/models/file';
import { files as fileTable } from '../db/schema';
import { log } from '../logger';
import { eq } from 'drizzle-orm';

const logger = log('serverutil').c('clearZeros');

export async function clearZerosFiles(): Promise<{ id: string; name: string }[]> {
  const files = await listFileRows({ where: eq(fileTable.size, 0) });
  return files.map(({ id, name }) => ({ id, name }));
}

export async function clearZeros(files: Awaited<ReturnType<typeof clearZerosFiles>>): Promise<string> {
  logger.info('preparing to clear files with a size of 0', { count: files.length });

  const count = await deleteFilesByIds(files.map((file) => file.id));

  logger.info('cleared files from the database with a size of 0', { count });

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    await datasource.delete(file.name);
    logger.info('deleted file from datasource', { id: file.id, name: file.name });
  }

  return `Cleared ${count} files with a size of 0.`;
}
