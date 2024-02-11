import { prisma } from '../db';

export type ParseValueMetrics = {
  files?: number;
  urls?: number;
  storage?: number;
  fileViews?: number;
  urlViews?: number;
};

export async function parserMetrics(id: string): Promise<{
  metricsUser: ParseValueMetrics;
  metricsZipline: ParseValueMetrics;
}> {
  const fileUser = await prisma.file.aggregate({
    _sum: {
      views: true,
      size: true,
    },
    _count: true,
    where: {
      userId: id,
    },
  });
  const urlUserCount = await prisma.url.aggregate({
    _sum: {
      views: true,
    },
    _count: true,
    where: {
      userId: id,
    },
  });

  const filesAll = await prisma.file.aggregate({
    _sum: {
      views: true,
      size: true,
    },
    _count: true,
  });
  const urlsAll = await prisma.url.aggregate({
    _sum: {
      views: true,
    },
    _count: true,
  });

  return {
    metricsUser: {
      files: fileUser._count,
      urls: urlUserCount._count,
      storage: Number(fileUser._sum.size ?? 0),
      fileViews: Number(fileUser._sum.views ?? 0),
      urlViews: urlUserCount._sum.views ?? 0,
    },
    metricsZipline: {
      files: filesAll._count,
      urls: urlsAll._count,
      storage: Number(filesAll._sum.size ?? 0),
      fileViews: Number(filesAll._sum.views ?? 0),
      urlViews: urlsAll._sum.views ?? 0,
    },
  };
}
