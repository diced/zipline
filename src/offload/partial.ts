import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { userSelect } from '@/lib/db/models/user';
import { onUpload } from '@/lib/webhooks';
import { log } from '@/lib/logger';
import { UploadOptions } from '@/lib/uploader/parseHeaders';
import { open, readFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { isMainThread, workerData } from 'worker_threads';

export type PartialWorkerData = {
  user: {
    id: string;
  };
  file: {
    id: string;
    filename: string;
    type: string;
  };
  options: UploadOptions;
  domain: string;
  responseUrl: string;
};

const { user, file, options, responseUrl, domain } = workerData as PartialWorkerData;
const logger = log('tasks').c('partial').c(file.filename);

worker();

if (isMainThread) {
  logger.error("partial upload worker can't run on the main thread");
  process.exit(1);
}

if (!options.partial) {
  logger.error('no partial upload options provided');
  process.exit(1);
}

if (!options.partial.lastchunk) {
  logger.error('no last chunk provided');
  process.exit(1);
}

if (!config.chunks.enabled) {
  logger.error('chunks are not enabled');
  process.exit(1);
}

async function worker() {
  logger.debug('started partial upload worker');

  const partials = await readdir(config.core.tempDirectory).then((files) =>
    files.filter((file) => file.startsWith(`zipline_partial_${options.partial!.identifier}`)),
  );

  const readChunks = partials.map((file) => {
    const [, , , start, end] = file.split('_');
    return { file, start: Number(start), end: Number(end) };
  });

  const incompleteFile = await prisma.incompleteFile.create({
    data: {
      chunksTotal: readChunks.length,
      chunksComplete: 0,
      status: 'PENDING',
      userId: user.id,
      metadata: {
        file,
      },
    },
  });

  // todo: support s3

  const fd = await open(join(config.datasource.local!.directory, file.filename), 'w');

  for (let i = 0; i !== readChunks.length; ++i) {
    const chunk = readChunks[i];

    const buffer = await readFile(join(config.core.tempDirectory, chunk.file));

    const { bytesWritten } = await fd.write(buffer, 0, buffer.length, chunk.start);

    await rm(join(config.core.tempDirectory, chunk.file));
    await prisma.incompleteFile.update({
      where: {
        id: incompleteFile.id,
      },
      data: {
        chunksComplete: {
          increment: 1,
        },
        status: 'PROCESSING',
      },
    });

    logger.debug(`wrote chunk ${i + 1}/${readChunks.length}`, {
      bytesWritten,
      start: chunk.start,
      end: chunk.end,
    });
  }

  await fd.close();

  await prisma.incompleteFile.update({
    where: {
      id: incompleteFile.id,
    },
    data: {
      status: 'COMPLETE',
    },
  });

  await runComplete(file.id);
}

async function runComplete(id: string) {
  const userr = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: userSelect,
  });
  if (!userr) return;

  const fileUpload = await prisma.file.update({
    where: {
      id,
    },
    data: {
      size: options.partial!.range[2],
      ...(options.maxViews && { maxViews: options.maxViews }),
      ...(options.deletesAt && { deletesAt: options.deletesAt }),
    },
    select: fileSelect,
  });

  logger.info(`${userr.username} uploaded ${fileUpload.name}`, { size: bytes(fileUpload.size) });

  await onUpload({
    user: userr,
    file: fileUpload,
    link: {
      raw: `${domain}/raw/${fileUpload.name}`,
      returned: responseUrl,
    },
  });
}
