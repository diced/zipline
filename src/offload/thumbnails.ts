import { bytes } from '@/lib/bytes';
import { Config } from '@/lib/config/validate';
import { getDatasource } from '@/lib/datasource';
import { Datasource } from '@/lib/datasource/Datasource';
import type { File } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { isMainThread, parentPort, workerData } from 'worker_threads';
import { dbProxy, pending } from './proxiedDb';

export type ThumbnailWorkerData = {
  id: string;
  enabled: boolean;
  config: Config;
};

type ThumbnailId = File['thumbnail'] & { id: string };

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

const formatMimes = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const workerId = randomCharacters(8);

function name(str: string) {
  return `${str}.${config.features.thumbnails.format}`;
}

function genThumbnail(input: string, output: string): Promise<Buffer | undefined> {
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
        if (!existsSync(output)) {
          logger.error('expected thumbnail file does not exist', { thumbnailTmp: output });
          unlinkSync(input);
          return resolve(undefined);
        }

        const buffer = readFileSync(output);

        unlinkSync(output);
        unlinkSync(input);
        logger.debug('removed temporary files', { file: input, thumbnail: output });

        resolve(buffer);
      })
      .run();
  });
}

async function generate(config: Config, datasource: Datasource, ids: string[]) {
  for (const id of ids) {
    const file = await dbProxy<File>('file.findUnique', {
      where: {
        id,
      },
      include: {
        thumbnail: true,
      },
    });

    if (!file) continue;
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

    const stream = await datasource.get(file.name);
    if (!stream) {
      logger.debug('could not read file from datasource, skipping', { id: file.id });
      continue;
    }

    const tmpFile = join(config.core.tempDirectory, `zthumbnail_${file.id}_${workerId}.tmp`);
    const writeStream = createWriteStream(tmpFile);
    await new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve as any);
    });

    const thumbnailTmpFile = join(config.core.tempDirectory, name(`zthumbnail_${file.id}_${workerId}`));
    const thumbnail = await genThumbnail(tmpFile, thumbnailTmpFile);
    if (!thumbnail || thumbnail.length === 0) continue;

    const existing = await datasource.size(name(`.thumbnail.${file.id}`));
    if (existing || existing === 0) {
      await datasource.delete(name(`.thumbnail.${file.id}`));
    }
    await datasource.put(name(`.thumbnail.${file.id}`), thumbnail, {
      mimetype: formatMimes[config.features.thumbnails.format] || 'image/jpeg',
    });

    const existingThumbnail = await dbProxy<ThumbnailId>('thumbnail.findFirst', {
      where: {
        fileId: file.id,
      },
    });

    let t;
    if (!existingThumbnail) {
      t = await dbProxy<ThumbnailId>('thumbnail.create', {
        data: {
          fileId: file.id,
          path: name(`.thumbnail.${file.id}`),
        },
      });
    } else {
      t = await dbProxy<ThumbnailId>('thumbnail.update', {
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
  getDatasource(config);

  const datasource = global.__datasource__;

  parentPort!.on('message', async (message) => {
    const { type, data } = message as {
      type: 0 | 1 | 'response';
      data?: string[];
    };

    switch (type) {
      case 0:
        logger.debug('received thumbnail generation request', { ids: data });
        try {
          await generate(config, datasource, data!);
        } catch (err) {
          logger.error('thumbnail generation failed', {
            err: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      case 1:
        logger.debug('received kill request');
        process.exit(0);
      case 'response':
        const { id, result } = message;
        if (pending[id]) {
          try {
            pending[id](JSON.parse(result));
          } catch (e) {
            pending[id](null);
            console.error(e);
          }
          delete pending[id];
        }
        break;
      default:
        logger.error('unknown message type', { type, message });
        break;
    }
  });
}

main();
