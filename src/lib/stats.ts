import { prisma } from './db';
import { MetricData } from './db/models/metric';

export async function queryStats(): Promise<MetricData> {
  const file = await prisma.file.aggregate({
    _sum: {
      views: true,
      size: true,
    },
    _count: true,
  });

  const url = await prisma.url.aggregate({
    _sum: {
      views: true,
    },
    _count: true,
  });

  const user = await prisma.user.aggregate({
    _count: true,
  });

  const filesByUser = await prisma.file.groupBy({
    by: ['userId'],
    _count: true,
    _sum: {
      views: true,
      size: true,
    },
  });

  const urlsByUser = await prisma.url.groupBy({
    by: ['userId'],
    _count: true,
    _sum: {
      views: true,
    },
  });

  for (let i = 0; i !== filesByUser.length; ++i) {
    const user = await prisma.user.findUnique({
      where: {
        id: filesByUser[i].userId!,
      },
    });

    filesByUser[i].userId = user?.username || 'unknown';
  }

  for (let i = 0; i !== urlsByUser.length; ++i) {
    const user = await prisma.user.findUnique({
      where: {
        id: urlsByUser[i].userId!,
      },
    });

    urlsByUser[i].userId = user?.username || 'unknown';
  }

  const types = await prisma.file.groupBy({
    by: ['type'],
    _count: true,
  });

  return {
    files: file._count,
    urls: url._count,
    users: user._count,
    storage: file._sum.size!,

    fileViews: file._sum.views!,
    urlViews: url._sum.views!,

    filesUsers: filesByUser.map((x) => ({
      username: x.userId!,
      sum: x._count,
      storage: x._sum.size!,
      views: x._sum.views!,
    })),
    urlsUsers: urlsByUser.map((x) => ({ username: x.userId!, sum: x._count, views: x._sum.views! })),

    types: types.map((x) => ({ type: x.type!, sum: x._count })),
  };
}
