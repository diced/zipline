import { File } from '@prisma/client';
import { spawn } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import config from 'lib/config';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { join } from 'path';
import { isMainThread, workerData, parentPort, threadId } from 'worker_threads';

const { id } = workerData as { id: number };

const logger = Logger.get('worker::thumbnail').child(threadId.toString() ?? 'unknown-ident');

parentPort.on('message', async (data: { id?: number; exit?: boolean }) => {
  if (data.id) {
    logger.debug(`recieved new id: ${data.id}`);
    await start(data.id);
  } else if (data.exit) {
    // help
    logger.debug('exiting in 30 seconds');
    await new Promise((resolve) => setTimeout(resolve, 1000 * 30));
    process.exit(0);
  }
});

if (isMainThread) {
  logger.error('worker is not a thread');
  process.exit(1);
}

async function loadThumbnail(path) {
  const args = ['-i', path, '-frames:v', '1', '-f', 'mjpeg', 'pipe:1'];

  const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'ignore'] });

  const data: Promise<Buffer> = new Promise((resolve, reject) => {
    child.stdout.once('data', resolve);
    child.once('error', reject);
  });

  return data;
}

async function loadFileTmp(file: File) {
  const stream = await datasource.get(file.name);

  // pipe to tmp file
  const tmpFile = join(config.core.temp_directory, `zipline_thumb_${file.id}_${file.id}.tmp`);
  const fileWriteStream = createWriteStream(tmpFile);

  await new Promise((resolve, reject) => {
    stream.pipe(fileWriteStream);
    stream.once('error', reject);
    stream.once('end', resolve);
  });

  return tmpFile;
}

async function start(id: number) {
  logger.debug(`starting thumbnail generation for ${id}`);

  const file = await prisma.file.findUnique({
    where: {
      id,
    },
    include: {
      thumbnail: true,
    },
  });

  if (!file) {
    logger.error('file not found');
    process.exit(1);
  }

  if (!file.mimetype.startsWith('video/')) {
    logger.info('file is not a video');
    process.exit(0);
  }

  if (file.thumbnail) {
    logger.info('thumbnail already exists');
    process.exit(0);
  }

  const tmpFile = await loadFileTmp(file);
  logger.debug(`loaded file to tmp: ${tmpFile}`);
  const thumbnail = await loadThumbnail(tmpFile);
  logger.debug(`loaded thumbnail: ${thumbnail.length} bytes mjpeg`);

  const { thumbnail: thumb } = await prisma.file.update({
    where: {
      id: file.id,
    },
    data: {
      thumbnail: {
        create: {
          name: `.thumb-${file.id}.jpg`,
        },
      },
    },
    select: {
      thumbnail: true,
    },
  });

  await datasource.save(thumb.name, thumbnail);

  logger.info(`thumbnail saved - ${thumb.name}`);
  logger.debug(`thumbnail ${JSON.stringify(thumb)}`);

  logger.debug(`removing tmp file: ${tmpFile}`);
  await rm(tmpFile, {
    maxRetries: 1,
  });
}

// "ready" message
parentPort.postMessage(true);
start(id);
