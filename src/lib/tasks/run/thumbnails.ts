import { IntervalTask, WorkerTask } from '..';

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

export default function thumbnails(prisma: typeof globalThis.__db__) {
  return async function (this: IntervalTask, rerun = false) {
    const thumbnailWorkers = this.tasks.tasks.filter(
      (x) => 'worker' in x && x.id.startsWith('thumbnail'),
    ) as unknown as WorkerTask[];

    if (!thumbnailWorkers.length) return;

    if (rerun) this.logger.debug('regenerating thumbnails for all videos');

    const thumbnailNeeded = await prisma.file.findMany({
      where: {
        ...(rerun ? {} : { thumbnail: { is: null } }),

        type: {
          startsWith: 'video/',
        },
        size: { gt: 0 },
      },
    });
    if (!thumbnailNeeded.length) return;

    this.logger.debug(`found ${thumbnailNeeded.length} files that need thumbnails`);

    runThumbnailWorkers(
      thumbnailWorkers,
      thumbnailNeeded.map((x) => x.id),
    );
  };
}
