import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import { canInteract } from '@/lib/role';
import { userMiddleware } from '@/server/middleware/user';
import { Prisma } from '@prisma/client';
import fastifyPlugin from 'fastify-plugin';
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

export const PATH = '/api/user/files';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Querystring: Query;
    }>({
      url: PATH,
      method: ['GET'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
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

        const searchQuery = req.query.searchQuery
          ? decodeURIComponent(req.query.searchQuery.trim()) ?? null
          : null;

        const { page, filter, favorite } = req.query;
        if (!page && !searchQuery) return res.badRequest('Page is required');
        if (isNaN(Number(page)) && !searchQuery) return res.badRequest('Page must be a number');

        const sortBy = validateSortBy.safeParse(req.query.sortBy || 'createdAt');
        if (!sortBy.success) return res.badRequest('Invalid sortBy value');

        const order = validateOrder.safeParse(req.query.order || 'desc');
        if (!order.success) return res.badRequest('Invalid order value');

        const searchField = validateSearchField.safeParse(req.query.searchField || 'name');
        if (!searchField.success) return res.badRequest('Invalid searchField value');

        const incompleteFiles = await prisma.incompleteFile.findMany({
          where: {
            userId: user.id,
            status: {
              not: 'COMPLETE',
            },
          },
        });

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
                      notIn: incompleteFiles.map((file) => file.metadata.file.id),
                    },
                  }
                : {
                    [searchField.data]: {
                      contains: searchQuery,
                      mode: 'insensitive',
                    },
                    id: {
                      notIn: incompleteFiles.map((file) => file.metadata.file.id),
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

          return res.send({
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
          id: {
            notIn: incompleteFiles.map((file) => file.metadata.file.id),
          },
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

        return res.send({
          page: files,
          total: count,
          pages: Math.ceil(count / perpage),
        });
      },
    });

    done();
  },
  { name: PATH },
);
