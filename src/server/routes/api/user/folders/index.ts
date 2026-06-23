import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder, cleanFolders, folderSchema } from '@/lib/db/models/folder';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { canInteract } from '@/lib/role';
import { zQsBoolean } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserFoldersResponse = Folder | Folder[];

const logger = log('api').c('user').c('folders');

export const PATH = '/api/user/folders';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'List folders for the authenticated user, optionally including files or filtering by parent/root.',
          querystring: z.object({
            noincl: zQsBoolean.optional(),
            user: z.string().optional(),
            parentId: z.string().optional(),
            root: zQsBoolean.optional(),
          }),
          response: {
            200: z.array(folderSchema),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { noincl, user: userId, parentId, root } = req.query;

        if (userId) {
          const targetUser = await prisma.user.findUnique({
            where: {
              id: userId,
            },
          });

          if (!targetUser) throw new ApiError(4009);
          if (req.user.id !== targetUser.id && !canInteract(req.user.role, targetUser.role))
            throw new ApiError(4009);
        }

        const folders = await prisma.folder.findMany({
          where: {
            userId: userId || req.user.id,
            ...(root && { parentId: null }),
            ...(parentId && { parentId }),
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            ...(!noincl && {
              files: {
                select: {
                  ...fileSelect,
                  password: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            }),
            _count: {
              select: {
                children: true,
                files: true,
              },
            },
            parent: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        });

        return res.send(cleanFolders(folders as unknown as Folder[]));
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description:
            'Create a new folder for the authenticated user, optionally public and/or seeded with files.',
          body: z.object({
            name: z.string().trim().min(1),
            isPublic: z.boolean().optional(),
            files: z.array(z.string()).optional(),
            parentId: z.string().optional(),
          }),
          response: {
            200: folderSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const { name, isPublic, parentId } = req.body;
        let files = req.body.files;

        if (parentId) {
          const parentFolder = await prisma.folder.findUnique({
            where: { id: parentId },
            select: { id: true, userId: true },
          });

          if (!parentFolder) throw new ApiError(4007);
          if (parentFolder.userId !== req.user.id) throw new ApiError(3003);
        }

        if (files) {
          const filesAdd = await prisma.file.findMany({
            where: {
              id: {
                in: files,
              },
              userId: req.user.id,
            },
            select: {
              id: true,
            },
          });

          if (!filesAdd.length) throw new ApiError(1026);

          files = filesAdd.map((f) => f.id);
        }

        const folder = await prisma.folder.create({
          data: {
            name,
            userId: req.user.id,
            ...(parentId && { parentId }),
            ...(files?.length && {
              files: {
                connect: files!.map((f) => ({ id: f })),
              },
            }),
            public: isPublic ?? false,
          },
          include: {
            files: {
              select: {
                ...fileSelect,
                password: true,
              },
            },
            _count: {
              select: {
                children: true,
                files: true,
              },
            },
            parent: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        });

        logger.info('folder created', {
          folder: folder.name,
          user: req.user.username,
          files: files?.length || undefined,
          parentId: parentId || undefined,
        });

        return res.send(cleanFolder(folder));
      },
    );
  },
  { name: PATH },
);
