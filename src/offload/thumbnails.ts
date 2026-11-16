import { Config } from '@/lib/config/validate';
import { datasource, getDatasource } from '@/lib/datasource';
import type { files } from '@/lib/db/schema';
import { isThumbnail } from '@/lib/fs';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import ffmpeg from '@/lib/ffmpeg';
import { createWriteStream } from 'fs';
import { readFile, rm } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { isMainThread, parentPort, workerData } from 'worker_threads';

export type ThumbnailWorkerData = {
  id: string;
  enabled: boolean;
  config: Config;
};

export type ThumbnailSource = Pick<typeof files.$inferSelect, 'id' | 'name' | 'type' | 'size' | 'updatedAt'>;

export type ThumbnailWorkerMessage = {
  type: 'generated';
  source: ThumbnailSource;
  path: string;
  size: number;
};

export type ThumbnailWorkerRequest = { type: 0; data: ThumbnailSource[] } | { type: 1 };

const { id, enabled, config } = workerData as ThumbnailWorkerData;

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

getDatasource(config);

const formatMimes = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const workerId = randomCharacters(8);

function name(str: string) {
  return `${str}.${config.features.thumbnails.format}`;
}

function genThumbnail(input: string, output: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .videoFilters('thumbnail')
      .frames(1)
      .output(output)
      .on('start', (cmd) => {
        logger.debug('generating thumbnail', { cmd });
      })
      .on('error', (err, _, stderr) => {
        if (stderr && stderr.includes('does not contain any stream')) {
          // mismatched mimetype, for example a video/ogg (.ogg) file with no video stream since
          // for this specific case just set the mimetype to audio/ogg
          // the method will return an empty buffer since there is no video stream

          logger.error(
            `file ${input} does not contain any video stream, it is probably an audio file... ignoring...`,
          );
          resolve(Buffer.alloc(0));
          return;
        }

        logger.error('failed to generate thumbnail', { err: err.message });
        reject(err);
      })
      .on('end', () => {
        readFile(output).then(resolve, reject);
      })
      .run();
  });
}

async function generate(files: ThumbnailSource[]) {
  for (const file of files) {
    if (isThumbnail(file.name)) continue;
    if (!file.type.startsWith('video/')) {
      logger.debug('received file that is not a video, skipping', { id: file.id, type: file.type });
      continue;
    }

    if (file.size === 0) {
      logger.debug('thumbnail with file of 0 size, skipping', {
        id: file.id,
      });
      continue;
    }

    const tmpFile = join(config.core.tempDirectory, `zthumbnail_${file.id}_${workerId}.tmp`);
    const thumbnailTmpFile = join(config.core.tempDirectory, name(`zthumbnail_${file.id}_${workerId}`));
    const thumbnailPath = name(`.thumbnail.${file.id}.${randomCharacters(16)}`);
    let removeThumbnail = false;
    try {
      const stream = await datasource.get(file.name);
      if (!stream) {
        logger.debug('could not read file from datasource, skipping', { id: file.id });
        continue;
      }

      await pipeline(stream, createWriteStream(tmpFile));

      const thumbnail = await genThumbnail(tmpFile, thumbnailTmpFile);
      if (thumbnail.length === 0) continue;

      removeThumbnail = true;
      await datasource.put(thumbnailPath, thumbnail, {
        mimetype: formatMimes[config.features.thumbnails.format],
      });

      parentPort!.postMessage({
        type: 'generated',
        source: file,
        path: thumbnailPath,
        size: thumbnail.length,
      });

      removeThumbnail = false;
    } catch (error) {
      logger.error('thumbnail generation failed', { id: file.id, error });
    } finally {
      if (removeThumbnail)
        await datasource.delete(thumbnailPath).catch((error) => {
          logger.warn('failed to remove unpublished thumbnail', { path: thumbnailPath, error });
        });

      const cleanup = await Promise.allSettled([
        rm(tmpFile, { force: true }),
        rm(thumbnailTmpFile, { force: true }),
      ]);

      for (const result of cleanup) {
        if (result.status === 'rejected')
          logger.warn('failed to remove temporary thumbnail file', { id: file.id, error: result.reason });
      }
    }
  }
}

let pending = Promise.resolve();
parentPort!.on('message', (message: ThumbnailWorkerRequest) => {
  pending = pending
    .then(async () => {
      if (message.type === 1) {
        logger.debug('received kill request');
        parentPort!.close();
        return;
      }

      logger.debug('received thumbnail generation request', { ids: message.data.map((file) => file.id) });
      await generate(message.data);
    })
    .catch((error) => {
      logger.error('thumbnail generation failed', { error });
    });
});
