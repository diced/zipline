import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserRecentResponse = File[];

type Query = {
  page?: string;
};

export async function handler(req: NextApiReq<any, Query>, res: NextApiRes<ApiUserRecentResponse>) {
  const files = cleanFiles(
    await prisma.file.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        ...fileSelect,
        password: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 3,
    }),
  );

  return res.ok(files);
}

export default combine([method(['GET', 'PATCH']), ziplineAuth()], handler);
