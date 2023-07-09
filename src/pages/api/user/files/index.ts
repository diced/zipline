import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

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
  perpage?: string;
  pagecount?: string;
  filter?: 'dashboard' | 'none' | 'all';
  favorite?: 'true' | 'false';
  sortBy: keyof Prisma.FileOrderByWithRelationInput;
  order: 'asc' | 'desc';
};

const validateSortBy = z
  .enum([
    'id',
    'createdAt',
    'updatedAt',
    'deletesAt',
    'name',
    'originalName',
    'size',
    'type',
    'views',
    'favorite',
  ])
  .default('createdAt');

const validateOrder = z.enum(['asc', 'desc']).default('desc');

export async function handler(req: NextApiReq<any, Query>, res: NextApiRes<ApiUserFilesResponse>) {
  const perpage = Number(req.query.perpage || '9');
  if (isNaN(Number(perpage))) return res.badRequest('Perpage must be a number');

  if (req.query.pagecount) {
    const count = await prisma.file.count({
      where: {
        userId: req.user.id,
      },
    });

    return res.ok({ count: Math.ceil(count / perpage) });
  }

  const { page, filter, favorite } = req.query;
  if (!page) return res.badRequest('Page is required');
  if (isNaN(Number(page))) return res.badRequest('Page must be a number');

  const sortBy = validateSortBy.safeParse(req.query.sortBy || 'createdAt');
  if (!sortBy.success) return res.badRequest('Invalid sortBy value');

  const order = validateOrder.safeParse(req.query.order || 'desc');
  if (!order.success) return res.badRequest('Invalid order value');

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
        ...(favorite === 'true' &&
          filter !== 'all' && {
            favorite: true,
          }),
      },
      select: {
        ...fileSelect,
        password: true,
      },
      orderBy: {
        [sortBy.data]: order.data,
      },
      skip: (Number(page) - 1) * perpage,
      take: perpage,
    })
  );

  return res.ok(files);
}

export default combine([method(['GET']), ziplineAuth()], handler);
