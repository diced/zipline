import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder, cleanFolders } from '@/lib/db/models/folder';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserFoldersResponse = Folder | Folder[];

type Body = {
  id?: string;
  files?: string[];

  name?: string;
  isPublic?: boolean;
  parentFolderId?: string;
};

type Query = {
  noincl?: boolean;
};

const logger = log('api').c('user').c('folders');

export const PATH = '/api/user/folders';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Querystring: Query;
    }>({
      url: PATH,
      method: 'GET',
      preHandler: [userMiddleware],
      handler: async (req, res) => {
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
            },
          }),
        });

        return res.send(cleanFolders(folders));
      },
    });

    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: 'POST',
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        const { name, isPublic, parentFolderId } = req.body;
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
            id: req.body.id,
            name,
            userId: req.user.id,
            ...(files?.length && {
              files: {
                connect: files!.map((f) => ({ id: f })),
              },
            }),
            public: isPublic ?? false,
            parentFolderId: parentFolderId ?? 'root'
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
    });

    done();
  },
  { name: PATH },
);
