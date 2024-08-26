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
    storage: Number(file._sum.size ?? 0),

    fileViews: Number(file._sum.views ?? 0),
    urlViews: url._sum.views ?? 0,

    filesUsers: filesByUser.map((x) => ({
      username: x.userId!,
      sum: x._count,
      storage: Number(x._sum.size ?? 0),
      views: x._sum.views ?? 0,
    })),
    urlsUsers: urlsByUser.map((x) => ({ username: x.userId!, sum: x._count, views: x._sum.views ?? 0 })),

    types: types.map((x) => ({ type: x.type!, sum: x._count })),
  };
}
