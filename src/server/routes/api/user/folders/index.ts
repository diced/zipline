import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder, cleanFolders } from '@/lib/db/models/folder';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserFoldersResponse = Folder | Folder[];

type Body = {
  files?: string[];

  name?: string;
  isPublic?: boolean;
};

type Query = {
  noincl?: boolean;
};

const logger = log('api').c('user').c('folders');

export const PATH = '/api/user/folders';
export default fastifyPlugin(
  (server, _, done) => {
    server.get<{ Querystring: Query }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const { noincl } = req.query;

      const folders = await prisma.folder.findMany({
        where: {
          userId: req.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        ...(!noincl && {
          include: {
            files: {
              select: {
                ...fileSelect,
                password: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            _count: {
              select: {
                files: true,
              },
            },
          },
        }),
        ...(noincl && {
          include: {
            _count: {
              select: {
                files: true,
              },
            },
          },
        }),
      });

      return res.send(cleanFolders(folders));
    });

    server.post<{ Body: Body }>(
      PATH,
      { preHandler: [userMiddleware], ...secondlyRatelimit(2) },
      async (req, res) => {
        const { name, isPublic } = req.body;
        let files = req.body.files;
        if (!name) return res.badRequest('Name is required');

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
          },
        });

        logger.info('folder created', {
          folder: folder.name,
          user: req.user.username,
          files: files?.length || undefined,
        });

        return res.send(cleanFolder(folder));
      },
    );

    done();
  },
  { name: PATH },
);
