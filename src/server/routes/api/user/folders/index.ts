import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder, cleanFolders } from '@/lib/db/models/folder';
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

export const PATH = '/api/user/folders';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
      Querystring: Query;
    }>({
      url: PATH,
      method: ['GET', 'POST'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        const { noincl } = req.query;

        if (req.method === 'POST') {
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
            ...(!noincl && {
              include: {
                files: {
                  select: {
                    ...fileSelect,
                    password: true,
                  },
                },
              },
            }),
          });

          return res.send(cleanFolder(folder));
        }

        const folders = await prisma.folder.findMany({
          where: {
            userId: req.user.id,
          },
          ...(!noincl && {
            include: {
              files: {
                select: {
                  ...fileSelect,
                  password: true,
                },
              },
            },
          }),
        });

        return res.send(cleanFolders(folders));
      },
    });

    done();
  },
  { name: PATH },
);
