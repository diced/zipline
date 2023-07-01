import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserFilesResponse =
  | File[]
  | {
      count: number;
    }
  | {
      totalCount: number;
    };

type Query = {
  page?: string;
  pagecount?: string;
  totalcount?: string;
  filter?: 'dashboard' | 'none';
};

const PAGE_COUNT = 9;

export async function handler(req: NextApiReq<any, Query>, res: NextApiRes<ApiUserFilesResponse>) {
  if (req.query.pagecount) {
    const count = await prisma.file.count({
      where: {
        userId: req.user.id,
      },
    });

    return res.ok({ count: Math.ceil(count / PAGE_COUNT) });
  }

  if (req.query.totalcount) {
    const totalCount = await prisma.file.count({
      where: {
        userId: req.user.id,
      },
    });

    return res.ok({ totalCount });
  }

  const { page, filter } = req.query;
  if (!page) return res.badRequest('Page is required');
  if (isNaN(Number(page))) return res.badRequest('Page must be a number');

  const files = cleanFiles(
    await prisma.file.findMany({
      where: {
        userId: req.user.id,
        ...(filter === 'dashboard' && {
          OR: [
            {
              type: { startsWith: 'image/' },
            },
            {
              type: { startsWith: 'video/' },
            },
            {
              type: { startsWith: 'audio/' },
            },
            {
              type: { startsWith: 'text/' },
            },
          ],
        }),
      },
      select: {
        ...fileSelect,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (Number(page) - 1) * PAGE_COUNT,
      take: PAGE_COUNT,
    })
  );

  return res.ok(files);
}

export default combine([method(['GET', 'PATCH']), ziplineAuth()], handler);
