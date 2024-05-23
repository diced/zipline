import { datasource } from '../datasource';
import { prisma } from '../db';
import { log } from '../logger';

const logger = log('serverutil').c('clearZeros');

export async function clearZerosFiles(): Promise<{ id: string; name: string }[]> {
  const files = await prisma.file.findMany({
    where: {
      size: 0,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return files;
}

export async function clearZeros(files: Awaited<ReturnType<typeof clearZerosFiles>>): Promise<string> {
  logger.info('preparing to clear files with a size of 0', { count: files.length });

  const { count } = await prisma.file.deleteMany({
    where: {
      id: {
        in: files.map((file) => file.id),
      },
    },
  });

  logger.info('cleared files from the database with a size of 0', { count });

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    await datasource.delete(file.name);
    logger.info('deleted file from datasource', { id: file.id, name: file.name });
  }

  return `Cleared ${count} files with a size of 0.`;
}
