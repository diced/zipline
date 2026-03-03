import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSchema, fileSelect } from '@/lib/db/models/file';
import { canInteract } from '@/lib/role';
import { zQsBoolean } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { checkInteraction } from '../folders/[id]';

export type FileSearchField = 'name' | 'originalName' | 'type' | 'tags' | 'id';

export type ApiUserFilesResponse = {
  page: File[];
  search?: {
    field: FileSearchField;
    query: string | string[];
  };
  total?: number;
  pages?: number;
};

export const PATH = '/api/user/files';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'List, filter, and search files for the authenticated user (or another user if permitted).',
          querystring: z.object({
            page: z.coerce.number(),
            perpage: z.coerce.number().default(15),
            filter: z.enum(['dashboard', 'none', 'all']).optional().default('none'),
            favorite: zQsBoolean.default(false).optional(),
            sortBy: z
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
              .optional()
              .default('createdAt'),
            order: z.enum(['asc', 'desc']).optional().default('desc'),
            searchField: z.enum(['name', 'originalName', 'type', 'tags', 'id']).optional().default('name'),
            searchQuery: z.string().optional(),
            id: z.string().optional(),
            folder: z.string().optional(),
          }),
          response: {
            200: z.object({
              page: z.array(fileSchema),
              search: z
                .object({
                  field: z.enum(['name', 'originalName', 'type', 'tags', 'id']),
                  query: z.union([z.string(), z.array(z.string())]),
                })
                .optional(),
              total: z.number().optional(),
              pages: z.number().optional(),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const user = await prisma.user.findUnique({
          where: {
            id: req.query.id ?? req.user.id,
          },
        });

        if (user && user.id !== req.user.id && !canInteract(req.user.role, user.role))
          throw new ApiError(9002);
        if (!user) throw new ApiError(9002);

        const { perpage, searchQuery, searchField, page, filter, favorite, sortBy, order, folder } =
          req.query;

        let folderId: string | null = null;
        if (folder) {
          const f = await prisma.folder.findFirst({
            where: {
              id: folder,
            },
            include: {
              User: true,
            },
          });
          if (!f) throw new ApiError(9002);
          if (!checkInteraction(req.user, f?.User)) throw new ApiError(9002);

          folderId = f.id;
        }

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

          if (searchField === 'tags') {
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

            if (foundTags.length !== parsedTags.length) throw new ApiError(1032);

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
              ...(favorite &&
                filter !== 'all' && {
                  favorite: true,
                }),
              ...(searchField === 'tags'
                ? {
                    id: {
                      in: tagFiles,
                      notIn: incompleteFiles.map((file) => file.metadata.file.id),
                    },
                  }
                : searchField === 'id'
                  ? {
                      id: {
                        contains: searchQuery,
                        notIn: incompleteFiles.map((file) => file.metadata.file.id),
                        mode: 'insensitive',
                      },
                    }
                  : {
                      [searchField]: {
                        contains: searchQuery,
                        mode: 'insensitive',
                      },
                      id: {
                        notIn: incompleteFiles.map((file) => file.metadata.file.id),
                      },
                    }),
              ...(folderId && {
                folderId,
              }),
            },
            select: fileSelect,
            orderBy: {
              [sortBy]: order,
            },
            skip: (Number(page) - 1) * perpage,
            take: perpage,
          });

          return res.send({
            page: cleanFiles(similarityResult),
            search: {
              field: searchField,
              query:
                searchField === 'tags'
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
          ...(favorite &&
            filter !== 'all' && {
              favorite: true,
            }),
          id: {
            notIn: incompleteFiles.map((file) => file.metadata.file.id),
          },
          ...(folderId && {
            folderId,
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
              [sortBy]: order,
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
    );
  },
  { name: PATH },
);
