import { IntervalTask, WorkerTask } from '..';

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
      },
    });
    if (!thumbnailNeeded.length) return;

    this.logger.debug(`found ${thumbnailNeeded.length} files that need thumbnails`);

    const thumbToWorker: { id: string; worker: number }[] = [];

    let workerIndex = 0;
    for (const file of thumbnailNeeded) {
      thumbToWorker.push({
        id: file.id,
        worker: workerIndex,
      });

      workerIndex = (workerIndex + 1) % thumbnailWorkers.length;
    }

    const ids = thumbnailWorkers.map((_, i) => thumbToWorker.filter((x) => x.worker === i).map((x) => x.id));

    for (let i = 0; i !== thumbnailWorkers.length; ++i) {
      if (!ids[i].length) continue;

      thumbnailWorkers[i].worker!.postMessage({
        type: 0,
        data: ids[i],
      });
    }
  };
}
