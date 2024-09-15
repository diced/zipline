import { bytes } from '@/lib/bytes';
import { reloadSettings } from '@/lib/config';
import { Config } from '@/lib/config/validate';
import { getDatasource } from '@/lib/datasource';
import { Datasource } from '@/lib/datasource/Datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { isMainThread, parentPort, workerData } from 'worker_threads';

export type ThumbnailWorkerData = {
  id: string;
  enabled: boolean;
};

const { id, enabled } = workerData as ThumbnailWorkerData;

const logger = log('tasks').c(id);

if (isMainThread) {
  logger.error("thumbnail worker can't run on the main thread");
  process.exit(1);
}

if (!enabled) {
  logger.debug('thumbnail generation is disabled');
  process.exit(0);
}

logger.debug('started thumbnail worker');

function genThumbnail(file: string, thumbnailTmp: string): Promise<Buffer | undefined> {
  return new Promise((resolve, reject) => {
    ffmpeg(file)
      .videoFilters('thumbnail')
      .frames(1)
      .format('mjpeg')
      .output(thumbnailTmp)
      .on('start', (cmd) => {
        logger.debug('generating thumbnail', { cmd });
      })
      .on('error', (err) => {
        logger.error('failed to generate thumbnail', { err: err.message });
        reject(err);
      })
      .on('end', () => {
        const buffer = readFileSync(thumbnailTmp);

        unlinkSync(thumbnailTmp);
        unlinkSync(file);
        logger.debug('removed temporary files', { file, thumbnail: thumbnailTmp });

        resolve(buffer);
      })
      .run();
  });
}

async function generate(config: Config, datasource: Datasource, ids: string[]) {
  for (const id of ids) {
    const file = await prisma.file.findUnique({
      where: {
        id,
      },
      include: {
        thumbnail: true,
      },
    });

    if (!file) return;
    if (!file.type.startsWith('video/')) {
      logger.debug('received file that is not a video', { id: file.id, type: file.type });
      continue;
    }

    const stream = await datasource.get(file.name);
    if (!stream) return;

    const tmpFile = join(config.core.tempDirectory, `zthumbnail_${file.id}.tmp`);
    const writeStream = createWriteStream(tmpFile);
    await new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });

    const thumbnailTmpFile = join(config.core.tempDirectory, `zthumbnail_${file.id}.jpg`);
    const thumbnail = await genThumbnail(tmpFile, thumbnailTmpFile);
    if (!thumbnail) return;

    const existing = await datasource.size(`.thumbnail.${file.id}.jpg`);
    if (existing || existing === 0) {
      await datasource.delete(`.thumbnail.${file.id}.jpg`);
    }

    await datasource.put(`.thumbnail.${file.id}.jpg`, thumbnail);

    const existingThumbnail = await prisma.thumbnail.findFirst({
      where: {
        fileId: file.id,
      },
    });

    let t;
    if (!existingThumbnail) {
      t = await prisma.thumbnail.create({
        data: {
          fileId: file.id,
          path: `.thumbnail.${file.id}.jpg`,
        },
      });
    } else {
      t = await prisma.thumbnail.update({
        where: {
          id: existingThumbnail.id,
        },
        data: {
          createdAt: new Date(),
        },
      });
    }

    logger.info('generated thumbnail', { id: t.id, fileId: file.id, size: bytes(thumbnail.length) });
  }
}

async function main() {
  await reloadSettings();

  const config = global.__config__;
  getDatasource(config);

  const datasource = global.__datasource__;

  parentPort!.on('message', async (d) => {
    const { type, data } = d as {
      type: 0 | 1;
      data?: string[];
    };

    switch (type) {
      case 0:
        logger.debug('received thumbnail generation request', { ids: data });
        await generate(config, datasource, data!);
        break;
      case 1:
        logger.debug('received kill request');
        process.exit(0);
      default:
        logger.error('received unknown message type', { type });
        break;
    }
  });
}

main();
