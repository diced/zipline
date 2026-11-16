import { removeGps } from '@/lib/gps';
import { log } from '@/lib/logger';
import { createReadStream, createWriteStream } from 'fs';
import { readdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { isMainThread, parentPort, workerData } from 'worker_threads';

export type PartialWorkerData = {
  file: { name: string; type: string };
  directory: string;
  identifier: string;
  size: number;
  temporaryPath: string;
  removeGpsMetadata: boolean;
  enabled: boolean;
};

export type PartialWorkerMessage =
  | { type: 'started'; chunksTotal: number }
  | { type: 'progress'; chunksComplete: number }
  | { type: 'complete'; size: number }
  | { type: 'failure'; error: string };

const { file, directory, identifier, size, temporaryPath, removeGpsMetadata, enabled } =
  workerData as PartialWorkerData;
const logger = log('tasks').c('partial').c(file.name);

if (isMainThread) {
  logger.error("partial upload worker can't run on the main thread");
  process.exit(1);
}

function send(message: PartialWorkerMessage) {
  parentPort!.postMessage(message);
}

async function main() {
  try {
    if (!enabled) throw new Error('Chunks are not enabled');

    const prefix = `zipline_partial_${identifier}_`;
    const partials = await readdir(directory);
    const readChunks = partials
      .filter((file) => file.startsWith(prefix) && /^\d+_\d+$/.test(file.slice(prefix.length)))
      .map((file) => {
        const [, , , start, end] = file.split('_');
        return { file, start: Number(start), end: Number(end) };
      })
      .sort((a, b) => a.start - b.start);

    let offset = 0;
    for (const chunk of readChunks) {
      if (chunk.start !== offset || !Number.isSafeInteger(chunk.end) || chunk.end < chunk.start)
        throw new Error('Partial upload has missing or invalid chunks');
      offset = chunk.end + 1;
    }
    if (offset !== size) throw new Error('Partial upload does not match its expected size');

    send({ type: 'started', chunksTotal: readChunks.length });
    logger.debug('started partial upload worker', { chunks: readChunks.length });

    for (let i = 0; i !== readChunks.length; ++i) {
      const chunk = readChunks[i];
      const chunkPath = join(directory, chunk.file);

      await pipeline(
        createReadStream(chunkPath),
        createWriteStream(temporaryPath, { start: chunk.start, flags: i === 0 ? 'w' : 'r+' }),
      );
      await rm(chunkPath);
      send({ type: 'progress', chunksComplete: i + 1 });

      logger.debug(`wrote chunk ${i + 1}/${readChunks.length}`, {
        start: chunk.start,
        end: chunk.end,
      });
    }

    if ((await stat(temporaryPath)).size !== size)
      throw new Error('Combined partial upload does not match its expected size');

    if (file.type.startsWith('image/') && removeGpsMetadata) {
      const removed = removeGps(temporaryPath);
      if (removed) logger.c('gps').debug(`removed gps metadata from ${file.name}`);
    }

    send({ type: 'complete', size: (await stat(temporaryPath)).size });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('partial upload failed', { error: message });
    send({ type: 'failure', error: message });
    process.exitCode = 1;
  } finally {
    parentPort!.close();
  }
}

void main();
