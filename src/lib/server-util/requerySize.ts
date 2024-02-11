import { datasource } from '../datasource';
import { prisma } from '../db';
import { log } from '../logger';

const logger = log('serverutil').c('requerySize');

export async function requerySize({
  forceDelete,
  forceUpdate,
}: {
  forceDelete?: boolean;
  forceUpdate?: boolean;
}): Promise<string> {
  logger.info('preparing to requery size of all files', { forceDelete, forceUpdate });

  const files = await prisma.file.findMany({
    ...(forceUpdate
      ? undefined
      : {
          where: {
            size: 0,
          },
        }),
    select: {
      id: true,
      name: true,
      size: true,
    },
  });
  logger.info('found files to requery size', { count: files.length });

  let notFound = false;

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];

    if (!(await datasource.get(file.name))) {
      if (forceDelete) {
        logger.info("deleting file from database because it's not in the datasource", {
          id: file.id,
          name: file.name,
        });

        await prisma.file.delete({
          where: {
            id: file.id,
          },
        });
        continue;
      } else {
        notFound ? null : (notFound = true);
        continue;
      }
    }

    const size = await datasource.size(file.name);
    if (size === 0) {
      logger.info('file has a size of 0 bytes', { id: file.id, name: file.name });
    } else {
      logger.info('file has a size', { id: file.id, name: file.name, size });
      await prisma.file.update({
        where: {
          id: file.id,
        },
        data: {
          size,
        },
      });
    }
  }

  const message = notFound
    ? 'At least one file did not exist within the datasource but was on the database, re run the script with the force delete option on to remove these files.'
    : 'Finished requerying all files.';

  logger.info(message);
  return message;
}
