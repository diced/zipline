import { bytes } from '@/lib/bytes';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { lockFiles } from '@/lib/db/models/file';
import { files, thumbnails } from '@/lib/db/schema';
import { isThumbnail } from '@/lib/fs';
import { log } from '@/lib/logger';
import type { ThumbnailSource, ThumbnailWorkerMessage, ThumbnailWorkerRequest } from '@/offload/thumbnails';
import { and, eq, gt, like, notInArray } from 'drizzle-orm';
import { IntervalTask, WorkerTask } from '..';

export function thumbnailWorker(id: string) {
  const logger = log('tasks').c(id);

  return async function (message: ThumbnailWorkerMessage) {
    if (message.type !== 'generated') return;

    const { source, path, size } = message;
    let published = false;
    try {
      if (isThumbnail(source.name)) return;

      const record = await db.transaction(async (tx) => {
        await lockFiles(tx);

        const [file] = await tx
          .select({ id: files.id })
          .from(files)
          .where(
            and(eq(files.id, source.id), eq(files.name, source.name), eq(files.updatedAt, source.updatedAt)),
          )
          .limit(1);
        if (!file || !(await datasource.size(path))) return null;

        const [record] = await tx
          .insert(thumbnails)
          .values({ fileId: source.id, path })
          .onConflictDoUpdate({
            target: thumbnails.fileId,
            set: { path, createdAt: new Date() },
          })
          .returning({ id: thumbnails.id });
        if (!record) throw new Error('Thumbnail upsert did not return a row');

        return record;
      });
      if (!record) {
        logger.debug('file changed during thumbnail generation, skipping', { id: source.id });
        return;
      }

      published = true;
      logger.info('generated thumbnail', { id: record.id, fileId: source.id, size: bytes(size) });
    } catch (error) {
      logger.error('failed to publish thumbnail', { fileId: source.id, error });
    } finally {
      if (!published)
        await datasource.delete(path).catch((error) => {
          logger.warn('failed to remove unpublished thumbnail', { path, error });
        });
    }
  };
}

export function runThumbnailWorkers(workers: WorkerTask[], sources: ThumbnailSource[]) {
  if (!workers.length || !sources.length) return;

  const batches: ThumbnailSource[][] = workers.map(() => []);
  let workerIndex = 0;
  for (const file of sources) {
    if (isThumbnail(file.name) || !file.type.startsWith('video/') || file.size === 0) continue;

    const { id, name, type, size, updatedAt } = file;
    batches[workerIndex].push({ id, name, type, size, updatedAt });
    workerIndex = (workerIndex + 1) % workers.length;
  }

  for (let i = 0; i !== workers.length; ++i) {
    if (!batches[i].length) continue;

    workers[i].worker!.postMessage({
      type: 0,
      data: batches[i],
    } satisfies ThumbnailWorkerRequest);
  }
}

export default function thumbnailsTask() {
  return async function (this: IntervalTask, rerun = false) {
    const thumbnailWorkers = this.tasks.tasks.filter(
      (x) => 'worker' in x && x.id.startsWith('thumbnail'),
    ) as unknown as WorkerTask[];

    if (!thumbnailWorkers.length) return;

    if (rerun) this.logger.debug('regenerating thumbnails for all videos');

    const thumbnailNeeded = await db
      .select({
        id: files.id,
        name: files.name,
        type: files.type,
        size: files.size,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(
        and(
          like(files.type, 'video/%'),
          gt(files.size, 0),
          !rerun
            ? notInArray(files.id, db.select({ fileId: thumbnails.fileId }).from(thumbnails))
            : undefined,
        ),
      );

    this.logger.debug(`found ${thumbnailNeeded.length} files that need thumbnails`);

    runThumbnailWorkers(thumbnailWorkers, thumbnailNeeded);
  };
}
