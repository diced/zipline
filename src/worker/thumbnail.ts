import { type File, PrismaClient, type Thumbnail } from '@prisma/client';
import { spawn } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import Logger from 'lib/logger';
import { randomChars } from 'lib/util';
import { join } from 'path';
import { isMainThread, workerData } from 'worker_threads';
import datasource from 'lib/datasource';
import config from 'lib/config';

const { videos } = workerData as {
  videos: (File & {
    thumbnail: Thumbnail;
  })[];
};

const logger = Logger.get('worker::thumbnail').child(randomChars(4));

logger.debug(`thumbnail generation for ${videos.length} videos`);

if (isMainThread) {
  logger.error('worker is not a thread');
  process.exit(1);
}

async function loadThumbnail(path) {
  const args = ['-i', path, '-frames:v', '1', '-f', 'mjpeg', 'pipe:1'];

  const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'ignore'] });

  const data: Buffer = await new Promise((resolve, reject) => {
    const buffers = [];

    child.stdout.on('data', (chunk) => {
      buffers.push(chunk);
    });

    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) {
        const msg = buffers.join('').trim();
        logger.debug(`cmd: ${ffmpeg} ${args.join(' ')}`);
        logger.error(`while ${path} child exited with code ${code}: ${msg}`);

        reject(new Error(`child exited with code ${code}`));
      } else {
        const buffer = Buffer.allocUnsafe(buffers.reduce((acc, val) => acc + val.length, 0));

        let offset = 0;
        for (let i = 0; i !== buffers.length; ++i) {
          const chunk = buffers[i];
          chunk.copy(buffer, offset);
          offset += chunk.length;
        }

        resolve(buffer);
      }
    });
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

async function start() {
  const prisma = new PrismaClient();

  for (let i = 0; i !== videos.length; ++i) {
    const file = videos[i];
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

    await datasource.save(thumb.name, thumbnail, { type: 'image/jpeg' });

    logger.info(`thumbnail saved - ${thumb.name}`);
    logger.debug(`thumbnail ${JSON.stringify(thumb)}`);

    logger.debug(`removing tmp file: ${tmpFile}`);
    await rm(tmpFile);
  }

  await prisma.$disconnect();
  process.exit(0);
}

start();
