import { datasource } from '@/lib/datasource';
import { IntervalJob } from '..';
import { bytes } from '@/lib/bytes';

export default function maxViewsJob(prisma: typeof globalThis.__db__) {
  return async function (this: IntervalJob) {
    const files = await prisma.file.findMany({
      where: {
        views: {
          gte: prisma.file.fields.maxViews,
        },
      },
      select: {
        name: true,
        id: true,
        maxViews: true,
        views: true,
        size: true,
      },
    });

    this.logger.debug(`found ${files.length} expired files`, {
      files: files.map((f) => f.name),
    });

    for (const file of files) {
      await datasource.delete(file.name);
    }

    const { count } = await prisma.file.deleteMany({
      where: {
        id: {
          in: files.map((f) => f.id),
        },
      },
    });

    if (count)
      this.logger.info(`deleted ${count} files due to max views`, {
        size: bytes(files.reduce((acc, f) => acc + f.size, 0)),
        files: files.map((f) => f.name),
      });
  };
}
