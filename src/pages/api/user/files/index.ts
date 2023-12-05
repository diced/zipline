import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
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
    field: 'name' | 'originalName' | 'type' | 'tags';
    query: string | string[];
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
  searchField?: 'name' | 'originalName' | 'type' | 'tags';
  searchQuery?: string;
  id?: string;
};

const validateSearchField = z.enum(['name', 'originalName', 'type', 'tags']).default('name');

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

  const searchQuery = req.query.searchQuery ? decodeURIComponent(req.query.searchQuery.trim()) ?? null : null;

  const { page, filter, favorite } = req.query;
  if (!page && !searchQuery) return res.badRequest('Page is required');
  if (isNaN(Number(page)) && !searchQuery) return res.badRequest('Page must be a number');

  const sortBy = validateSortBy.safeParse(req.query.sortBy || 'createdAt');
  if (!sortBy.success) return res.badRequest('Invalid sortBy value');

  const order = validateOrder.safeParse(req.query.order || 'desc');
  if (!order.success) return res.badRequest('Invalid order value');

  const searchField = validateSearchField.safeParse(req.query.searchField || 'name');
  if (!searchField.success) return res.badRequest('Invalid searchField value');

  if (searchQuery) {
    let tagFiles: string[] = [];

    if (searchField.data === 'tags') {
      const parsedTags = searchQuery
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const foundTags = await prisma.tag.findMany({
        where: {
          userId: user.id,
          id: {
            in: searchQuery
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag),
          },
        },
        include: {
          files: {
            select: {
              id: true,
            },
          },
        },
      });

      if (foundTags.length !== parsedTags.length) return res.badRequest('invalid tag somewhere');

      tagFiles = foundTags
        .map((tag) => tag.files.map((file) => file.id))
        .reduce((a, b) => a.filter((c) => b.includes(c)));
    }

    const similarityResult = await prisma.file.findMany({
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
        ...(searchField.data === 'tags'
          ? {
              id: {
                in: tagFiles,
              },
            }
          : {
              [searchField.data]: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            }),
      },
      select: fileSelect,
      orderBy: {
        [sortBy.data]: order.data,
      },
      skip: (Number(page) - 1) * perpage,
      take: perpage,
    });

    return res.ok({
      page: cleanFiles(similarityResult),
      search: {
        field: searchField.data,
        query:
          searchField.data === 'tags'
            ? searchQuery
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag)
            : searchQuery,
      },
    });
  }

  const where = {
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
  };

  const count = await prisma.file.count({
    where,
  });

  const files = cleanFiles(
    await prisma.file.findMany({
      where,
      select: {
        ...fileSelect,
        password: true,
      },
      orderBy: {
        [sortBy.data]: order.data,
      },
      skip: (Number(page) - 1) * perpage,
      take: perpage,
    }),
  );

  return res.ok({
    page: files,
    total: count,
    pages: Math.ceil(count / perpage),
  });
}

export default combine([method(['GET']), ziplineAuth()], handler);
