import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { canInteract } from '@/lib/role';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export type ApiUserFilesResponse = {
  page: File[];
  search?: {
    field: 'name' | 'originalName' | 'type';
    query: string;
    treshold: number;
  };
  total?: number;
  pages?: number;
};

type Query = {
  page?: string;
  perpage?: string;
  filter?: 'dashboard' | 'none' | 'all';
  favorite?: 'true' | 'false';
  sortBy: keyof Prisma.FileOrderByWithAggregationInput;
  order: 'asc' | 'desc';
  searchField?: 'name' | 'originalName' | 'type';
  searchQuery?: string;
  searchTreshold?: string;
  id?: string;
};

const validateSearchField = z.enum(['name', 'originalName', 'type']).default('name');

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
    'similarity',
  ])
  .default('createdAt');

const validateOrder = z.enum(['asc', 'desc']).default('desc');
const validateTreshold = z.number().default(0.1);

const logger = log('api').c('user').c('files');

export async function handler(req: NextApiReq<any, Query>, res: NextApiRes<ApiUserFilesResponse>) {
  const user = await prisma.user.findUnique({
    where: {
      id: req.query.id ?? req.user.id,
    },
  });

  if (user && user.id !== req.user.id && !canInteract(req.user.role, user.role))
    return res.forbidden("You can't view this user's files.");

  if (!user) return res.notFound('User not found');

  const perpage = Number(req.query.perpage || '9');
  if (isNaN(Number(perpage))) return res.badRequest('Perpage must be a number');

  const count = await prisma.file.count({
    where: {
      userId: user.id,
    },
  });

  const searchQuery = req.query.searchQuery ? decodeURIComponent(req.query.searchQuery.trim()) ?? null : null;

  const { page, filter, favorite } = req.query;
  if (!page && !searchQuery) return res.badRequest('Page is required');
  if (isNaN(Number(page)) && !searchQuery) return res.badRequest('Page must be a number');

  const sortBy = validateSortBy.safeParse(req.query.sortBy || 'createdAt');
  if (!sortBy.success) return res.badRequest('Invalid sortBy value');
  if (sortBy.data === 'similarity' && !searchQuery)
    return res.badRequest("Can't use sortBy=similarity when searchQuery is empty");

  const order = validateOrder.safeParse(req.query.order || 'desc');
  if (!order.success) return res.badRequest('Invalid order value');

  const searchField = validateSearchField.safeParse(req.query.searchField || 'name');
  if (!searchField.success) return res.badRequest('Invalid searchField value');

  const searchTreshold = validateTreshold.safeParse(Number(req.query.searchTreshold) || 0.1);
  if (!searchTreshold.success) return res.badRequest('Invalid searchTreshold value');

  if (searchQuery) {
    const extension: { extname: string }[] =
      await prisma.$queryRaw`SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';`;
    if (extension.length === 0) {
      logger.debug('pg_trgm extension not found, installing...');
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
      logger.debug('pg_trgm extension installed');
    }

    // Doing Prisma.sql([...]) is unsafe as it will not escape any values leading to SQL injection
    // there might be a better way, but all the values that use Prisma.sql([...]) are validated and should not
    // be able to be used for SQL injection

    const similarityResult: (File & { similarty: number })[] = await prisma.$queryRaw(
      Prisma.sql`
        SELECT word_similarity("${Prisma.sql([
          searchField.data,
        ])}", ${searchQuery}) as similarity, "createdAt", "updatedAt", "deletesAt", favorite, id, "originalName", name, size, type, views, "folderId" FROM "File" WHERE
        word_similarity("${Prisma.sql([searchField.data])}", ${searchQuery}) > ${Prisma.sql([
        String(searchTreshold.data),
      ])} OR
        "${Prisma.sql([searchField.data])}" ILIKE '${Prisma.sql`%${searchQuery}%`}'
        AND
          "userId" = ${user.id}
          ${
            filter === 'dashboard'
              ? Prisma.sql`AND
            type LIKE 'image/%' OR
            type LIKE 'video/%' OR
            type LIKE 'audio/%' OR
            type LIKE 'text/%'
            `
              : Prisma.empty
          }
          ${favorite === 'true' && filter !== 'all' ? Prisma.sql`AND favorite = true` : Prisma.empty}

          ORDER BY "${Prisma.sql([sortBy.data])}" ${Prisma.sql([order.data])}
          `
    );

    return res.ok({
      page: cleanFiles(similarityResult),
      search: {
        field: searchField.data,
        query: searchQuery,
        treshold: searchTreshold.data,
      },
    });
  }

  const files = cleanFiles(
    await prisma.file.findMany({
      where: {
        userId: user.id,
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
        ...(searchQuery && {}),
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

  return res.ok({
    page: files,
    total: count,
    pages: Math.ceil(count / perpage),
  });
}

export default combine([method(['GET']), ziplineAuth()], handler);
