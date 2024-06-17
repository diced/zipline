import { datasource } from '@/lib/datasource';
import { IntervalTask } from '..';
import { bytes } from '@/lib/bytes';

export default function maxViews(prisma: typeof globalThis.__db__) {
  return async function (this: IntervalTask) {
    const files = await prisma.file.findMany({
      where: {
        views: {
          gte: prisma.file.fields.maxViews,
        },
      },
      select: {
        name: true,
        id: true,
        size: true,
      },
    });

    this.logger.debug(`found ${files.length} expired files`, {
      files: files.map((f) => f.name),
    });

    const urls = await prisma.url.findMany({
      where: {
        views: {
          gte: prisma.url.fields.maxViews,
        },
      },
      select: {
        id: true,
        destination: true,
      },
    });

    this.logger.debug(`found ${urls.length} expired urls`, {
      dests: urls.map((u) => u.destination),
    });

    for (const file of files) {
      try {
        await datasource.delete(file.name);
      } catch {
        this.logger.error('failed to delete file from datasource', {
          file: file.name,
        });
      }
    }

    const fileDelete = prisma.file.deleteMany({
      where: {
        id: {
          in: files.map((f) => f.id),
        },
      },
    });

    const urlDelete = prisma.url.deleteMany({
      where: {
        id: {
          in: urls.map((u) => u.id),
        },
      },
    });

    const [{ count: fileCount }, { count: urlCount }] = await prisma.$transaction([fileDelete, urlDelete]);

    if (fileCount)
      this.logger.info(`deleted ${fileCount} files due to max views`, {
        size: bytes(files.reduce((acc, f) => acc + f.size, 0)),
        files: files.map((f) => f.name),
      });

    if (urlCount)
      this.logger.info(`deleted ${urlCount} urls due to max views`, {
        dests: urls.map((u) => u.destination),
      });
  };
}
