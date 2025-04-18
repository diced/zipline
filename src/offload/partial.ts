import { bytes } from '@/lib/bytes';
import { reloadSettings } from '@/lib/config';
import { getDatasource } from '@/lib/datasource';
import { S3Datasource } from '@/lib/datasource/S3';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { encryptBuffer } from '@/lib/crypto';
import { IncompleteFile } from '@/lib/db/models/incompleteFile';
import { userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { UploadOptions } from '@/lib/uploader/parseHeaders';
import { onUpload } from '@/lib/webhooks';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream, createWriteStream } from 'fs';
import { open, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { isMainThread, workerData } from 'worker_threads';
import { Readable } from 'stream';

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
  encryption: {
    enabled?: boolean;
    key?: string;
    algorithm?: 'aes-256-gcm' | 'chacha20-poly1305';
  };
};

const { user, file, options, responseUrl, domain, encryption } = workerData as PartialWorkerData;
const logger = log('tasks').c('partial').c(file.filename);

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

main();

async function main() {
  await reloadSettings();

  const config = global.__config__;
  getDatasource(config);

  if (!config.chunks.enabled) {
    logger.error('chunks are not enabled');
    process.exit(1);
  }

  const datasource = global.__datasource__;

  logger.debug('started partial upload worker');

  const partials = await readdir(config.core.tempDirectory).then((files) =>
    files.filter((file) => file.startsWith(`zipline_partial_${options.partial!.identifier}`)),
  );

  const readChunks = partials
    .map((file) => {
      const [, , , start, end] = file.split('_');
      return { file, start: Number(start), end: Number(end) };
    })
    .sort((a, b) => a.start - b.start);

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

  const finalPath =
    config.datasource.type === 'local'
      ? join(config.datasource.local!.directory, file.filename)
      : join(config.core.tempDirectory, randomCharacters(16));

  const fd = await open(finalPath, 'w');
  await fd.close();

  for (let i = 0; i !== readChunks.length; ++i) {
    const chunk = readChunks[i];

    const chunkPath = join(config.core.tempDirectory, chunk.file);

    try {
      await new Promise<void>((resolve, reject) => {
        const readStream = createReadStream(chunkPath);
        const writeStream = createWriteStream(finalPath, { start: chunk.start, flags: 'r+' });

        readStream.pipe(writeStream);

        writeStream.on('finish', resolve);

        writeStream.on('error', reject);
      });

      await rm(chunkPath);
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
        start: chunk.start,
        end: chunk.end,
      });
    } catch (e) {
      logger.error('error while combining chunks');
      console.error(e);
      await failPartial(incompleteFile);

      process.exit(1);
    }
  }

  let finalBuffer: Buffer;
  let finalSize: number;
  try {
    const assembledHandle = await open(finalPath, 'r');
    finalBuffer = await assembledHandle.readFile();
    await assembledHandle.close();
    logger.debug(`read assembled file from ${finalPath}, size: ${finalBuffer.length}`);

    if (encryption?.enabled && encryption.key && encryption.algorithm) {
      logger.info(`encrypting assembled file using ${encryption.algorithm}`);
      try {
        const encryptedBuffer = await encryptBuffer(finalBuffer, encryption.key, encryption.algorithm);
        logger.info(
          `encryption successful; original size: ${finalBuffer.length}, encrypted size: ${encryptedBuffer.length}`,
        );
        finalBuffer = encryptedBuffer;
      } catch (encError) {
        const errorContext =
          encError instanceof Error
            ? { error: encError.message, stack: encError.stack }
            : { error: String(encError) };
        logger.error('Failed to encrypt assembled file', errorContext);
        await failPartial(incompleteFile);
        process.exit(1);
      }
    } else {
      logger.info('encryption not enabled or key/algorithm missing, skipping encryption');
    }
    finalSize = finalBuffer.length;
  } catch (readError) {
    const errorContext =
      readError instanceof Error
        ? { error: readError.message, stack: readError.stack }
        : { error: String(readError) };
    logger.error('failed to read assembled file for final processing', errorContext);
    await failPartial(incompleteFile);
    process.exit(1);
  }

  if (config.datasource.type === 's3') {
    logger.debug('starting multipart upload process for s3');

    const bodyStream = Readable.from(finalBuffer);
    const s3datasource = datasource as S3Datasource;

    try {
      const upload = new Upload({
        client: s3datasource.client,
        params: {
          Bucket: s3datasource.options.bucket,
          Key: file.filename,
          Body: bodyStream,
        },
        partSize: bytes(config.chunks.size),
        leavePartsOnError: false,
      });

      upload.on('httpUploadProgress', (progress) => logger.debug('s3 MultipartUpload', { ...progress }));

      await upload.done();

      await rm(finalPath);
    } catch (e) {
      logger.error('error while uploading multipart file to S3');
      console.error(e);
      await failPartial(incompleteFile);

      process.exit(1);
    }
  } else if (config.datasource.type === 'local') {
    logger.debug(`writing final buffer to local datasource path: ${finalPath}`);
    try {
      const localHandle = await open(finalPath, 'w');
      await localHandle.writeFile(finalBuffer);
      await localHandle.close();
      logger.debug(`successfully wrote final buffer to ${finalPath}`);
    } catch (writeError) {
      const errorContext =
        writeError instanceof Error
          ? { error: writeError.message, stack: writeError.stack }
          : { error: String(writeError) };
      logger.error('failed to write final buffer to local datasource path', errorContext);
      await failPartial(incompleteFile);
      process.exit(1);
    }
  }

  await prisma.incompleteFile.update({
    where: {
      id: incompleteFile.id,
    },
    data: {
      status: 'COMPLETE',
    },
  });

  await runComplete(file.id, BigInt(finalSize));
}

async function runComplete(id: string, finalSize: bigint) {
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
      size: finalSize,
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

function failPartial(incompleteFile: IncompleteFile) {
  logger.error('failing incomplete file', { id: incompleteFile.id });
  return prisma.incompleteFile.update({
    where: {
      id: incompleteFile.id,
    },
    data: {
      status: 'FAILED',
    },
  });
}
