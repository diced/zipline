import { db } from '@/lib/db';
import { IntervalTask, WorkerTask } from '..';
import { files, thumbnails } from '@/lib/db/schema';
import { and, gt, like, notInArray } from 'drizzle-orm';

export function runThumbnailWorkers(workers: WorkerTask[], files: string[]) {
  const thumbToWorker: { id: string; worker: number }[] = [];

  let workerIndex = 0;
  const unique = new Set(files);
  for (const file of unique) {
    thumbToWorker.push({
      id: file,
      worker: workerIndex,
    });

    workerIndex = (workerIndex + 1) % workers.length;
  }

  const ids = workers.map((_, i) => thumbToWorker.filter((x) => x.worker === i).map((x) => x.id));

  for (let i = 0; i !== workers.length; ++i) {
    if (!ids[i].length) continue;

    workers[i].worker!.postMessage({
      type: 0,
      data: ids[i],
    });
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
      .select({ id: files.id })
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

    runThumbnailWorkers(
      thumbnailWorkers,
      thumbnailNeeded.map((x) => x.id),
    );
  };
}
