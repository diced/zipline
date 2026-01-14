import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder, cleanFolders } from '@/lib/db/models/folder';
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
          querystring: z.object({
            noincl: zQsBoolean.optional(),
            user: z.string().optional(),
            parentId: z.string().optional(),
            root: z.string().optional(),
          }),
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { noincl, user, parentId, root } = req.query;

        if (user) {
          const user = await prisma.user.findUnique({
            where: {
              id: req.user.id,
            },
          });

          if (!user) return res.notFound();
          if (req.user.id !== user.id) {
            if (!canInteract(req.user.role, user.role)) return res.notFound();
          }
        }

        const folders = await prisma.folder.findMany({
          where: {
            userId: user || req.user.id,
            ...(root !== undefined && { parentId: null }),
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

        return res.send(cleanFolders(folders));
      },
    );

    server.post(
      PATH,
      {
        schema: {
          body: z.object({
            name: z.string().trim().min(1),
            isPublic: z.boolean().optional(),
            files: z.array(z.string()).optional(),
            parentId: z.string().optional(),
          }),
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

          if (!parentFolder) return res.notFound('Parent folder not found');
          if (parentFolder.userId !== req.user.id)
            return res.forbidden('Parent folder does not belong to you');
        }

        if (files) {
          const filesAdd = await prisma.file.findMany({
            where: {
              id: {
                in: files,
              },
            },
            select: {
              id: true,
            },
          });

          if (!filesAdd.length) return res.badRequest('No files found, with given request');

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
