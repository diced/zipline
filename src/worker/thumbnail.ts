import { type File, PrismaClient, type Thumbnail } from '@prisma/client';
import { type ChildProcess, spawn } from 'child_process';
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

async function getDuration(path): Promise<number> {
  const args = ['-hide_banner', '-nostdin', '-i', path, '-f', 'null', 'pipe:1'];
  const lengthMatch = new RegExp(/time=(?<time>(\d{2,}:){2}\d{2}\.\d{2})/);

  const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const data: string = await new Promise((resolve, reject) => {
    const buffers: string[] = [];

    child.stderr.on('data', (d) => child.stdout.emit('data', d));

    child.stdout.on('data', (d) => buffers.push(d.toString()));

    child.once('error', (...a) => {
      console.log(a);

      reject();
    });
    child.once('close', (code) => {
      if (code !== 0) {
        const msg = buffers.join('').trim().split('\n');

        logger.debug(`cmd: ${ffmpeg} ${args.join(' ')}\n${msg.join('\n')}`);
        logger.error(`child exited with code ${code}: ${msg[msg.length - 1]}`);

        if (msg[msg.length - 1].includes('does not contain any stream')) {
          // mismatched mimetype, for example a video/ogg (.ogg) file with no video stream since
          // for this specific case just set the mimetype to audio/ogg
          // the method will return an empty buffer since there is no video stream

          logger.error(`file ${path} does not contain any video stream, it is probably an audio file`);
          resolve('ow');
        }

        reject(new Error(`child exited with code ${code} ffmpeg output:\n${msg.join('\n')}`));
      } else {
        const trimBuffs: string[] = buffers.filter((val) => lengthMatch.exec(val));
        resolve(trimBuffs[trimBuffs.length - 1].split('\n')[0]);
      }
    });
  });

  const matchLength = lengthMatch.exec(data);
  if (!matchLength) return 0;

  const timeArr = matchLength.groups.time.split(':');

  return parseFloat(timeArr.reduce((prev, curr) => (parseFloat(prev) * 60 + parseFloat(curr)).toString()));
}

async function handleChild(child: ChildProcess, path: string, args: string[]): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const buffers = [];
    const errorBuffers = [];

    child.stderr.on('data', (chunk) => {
      errorBuffers.push(chunk);
    });

    child.stdout.on('data', (chunk) => {
      buffers.push(chunk);
    });

    child.once('error', (...a) => {
      console.log(a);

      reject();
    });
    child.once('close', (code) => {
      if (code !== 0) {
        const msg = errorBuffers.join('').trim().split('\n');

        logger.debug(`cmd: ${ffmpeg} ${args.join(' ')}\n${msg.join('\n')}`);
        logger.error(`child exited with code ${code}: ${msg[msg.length - 1]}`);

        if (msg[msg.length - 1].includes('does not contain any stream')) {
          // mismatched mimetype, for example a video/ogg (.ogg) file with no video stream since
          // for this specific case just set the mimetype to audio/ogg
          // the method will return an empty buffer since there is no video stream

          logger.error(`file ${path} does not contain any video stream, it is probably an audio file`);
          resolve(Buffer.alloc(0));
        }

        reject(new Error(`child exited with code ${code} ffmpeg output:\n${msg.join('\n')}`));
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
}

async function loadGifThumbnail(path): Promise<Buffer> {
  if (!config.features.gif_thumbnails) return;
  const duration = await getDuration(path);

  if (duration <= 5) return;

  let start: number = duration;
  const re = () => (start = Math.floor(Math.random() * duration * 100) / 100);
  while (start + 3 >= duration) re();

  const args = [
    '-i',
    path,
    '-ss',
    start.toString(),
    '-t',
    '3',
    '-vf',
    'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse',
    '-loop',
    '0',
    '-f',
    'gif',
    'pipe:1',
  ];

  const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const data: Buffer = await handleChild(child, path, args);

  return data;
}

async function loadThumbnail(path): Promise<Buffer> {
  const args = ['-i', path, '-frames:v', '1', '-f', 'mjpeg', 'pipe:1'];

  const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const data: Buffer = await handleChild(child, path, args);

  return data;
}

async function loadFileTmp(file: File) {
  const stream = await datasource.get(file.name);

  // pipe to tmp file
  const tmpFile = join(
    config.core.temp_directory,
    `zipline_thumb_${file.id}_${file.mimetype.replace('/', '_')}.tmp`,
  );
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
      continue;
    }

    if (file.thumbnail) {
      logger.info('thumbnail already exists');
      continue;
    }

    const tmpFile = await loadFileTmp(file);
    logger.debug(`loaded file to tmp: ${tmpFile}`);
    let useStill = false,
      thumbnail: Buffer = await loadGifThumbnail(tmpFile);
    if (!thumbnail) {
      useStill = true;
      thumbnail = await loadThumbnail(tmpFile);
    }
    logger.debug(`loaded thumbnail: ${thumbnail.length} bytes ${useStill ? 'mjpeg' : 'gif'}`);

    if (thumbnail.length === 0 && file.mimetype === 'video/ogg') {
      logger.info('file might be an audio file, setting mimetype to audio/ogg to avoid future errors');
      await prisma.file.update({
        where: {
          id: file.id,
        },
        data: {
          mimetype: 'audio/ogg',
        },
      });

      await rm(tmpFile);
      await prisma.$disconnect();
      process.exit(0);
    }

    const { thumbnail: thumb } = await prisma.file.update({
      where: {
        id: file.id,
      },
      data: {
        thumbnail: {
          create: {
            name: `.thumb-${file.id}.${useStill ? 'jpg' : 'gif'}`,
          },
        },
      },
      select: {
        thumbnail: true,
      },
    });

    await datasource.save(thumb.name, thumbnail, { type: useStill ? 'image/jpeg' : 'image/gif' });

    logger.info(`thumbnail saved - ${thumb.name}`);
    logger.debug(`thumbnail ${JSON.stringify(thumb)}`);

    logger.debug(`removing tmp file: ${tmpFile}`);
    await rm(tmpFile);
  }

  await prisma.$disconnect();
  process.exit(0);
}

start();
