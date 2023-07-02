import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserStatsResponse = {
  filesUploaded: number;
  views: number;
  avgViews: number;
  storageUsed: number;
  avgStorageUsed: number;
};

export async function handler(req: NextApiReq, res: NextApiRes<ApiUserStatsResponse>) {
  const agg = await prisma.file.aggregate({
    where: {
      userId: req.user.id,
    },
    _count: true,
    _sum: {
      views: true,
      size: true,
    },
    _avg: {
      views: true,
      size: true,
    },
  });

  return res.ok({
    filesUploaded: agg._count,
    views: agg._sum.views ?? 0,
    avgViews: agg._avg.views ?? 0,
    storageUsed: agg._sum.size ?? 0,
    avgStorageUsed: agg._avg.size ?? 0,
  });
}

export default combine([method(['GET']), ziplineAuth()], handler);
