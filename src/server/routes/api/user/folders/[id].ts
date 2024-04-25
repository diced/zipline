import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserFoldersIdResponse = Folder;

type Params = {
  id: string;
};

type Body = {
  id?: string;
  isPublic?: boolean;

  delete?: 'file' | 'folder';
};

export const PATH = '/api/user/folders/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
      Params: Params;
    }>({
      url: PATH,
      method: ['GET', 'POST', 'PATCH', 'DELETE'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        const { id } = req.params;

        const folder = await prisma.folder.findUnique({
          where: {
            id,
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
        if (!folder) return res.notFound('Folder not found');
        if (req.user.id !== folder.userId) return res.forbidden('You do not own this folder');

        if (req.method === 'POST') {
          const { id } = req.body;
          if (!id) return res.badRequest('File id is required');

          const file = await prisma.file.findUnique({
            where: {
              id,
            },
          });
          if (!file) return res.notFound('File not found');
          if (file.userId !== req.user.id) return res.forbidden('You do not own this file');

          const fileInFolder = await prisma.file.findFirst({
            where: {
              id,
              Folder: {
                id: folder.id,
              },
            },
          });
          if (fileInFolder) return res.badRequest('File already in folder');

          const nFolder = await prisma.folder.update({
            where: {
              id: folder.id,
            },
            data: {
              files: {
                connect: {
                  id,
                },
              },
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

          return res.send(cleanFolder(nFolder));
        } else if (req.method === 'PATCH') {
          const { isPublic } = req.body;
          if (isPublic === undefined) return res.badRequest('isPublic is required');

          const nFolder = await prisma.folder.update({
            where: {
              id: folder.id,
            },
            data: {
              public: isPublic,
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

          return res.send(cleanFolder(nFolder));
        } else if (req.method === 'DELETE') {
          const { delete: del } = req.body;

          if (del === 'folder') {
            const nFolder = await prisma.folder.delete({
              where: {
                id: folder.id,
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

            return res.send(cleanFolder(nFolder));
          } else if (del === 'file') {
            const { id } = req.body;
            if (!id) return res.badRequest('File id is required');

            const file = await prisma.file.findUnique({
              where: {
                id,
              },
            });
            if (!file) return res.notFound('File not found');
            if (file.userId !== req.user.id) return res.forbidden('You do not own this file');

            const fileInFolder = await prisma.file.findFirst({
              where: {
                id,
                Folder: {
                  id: folder.id,
                },
              },
            });
            if (!fileInFolder) return res.badRequest('File not in folder');

            const nFolder = await prisma.folder.update({
              where: {
                id: folder.id,
              },
              data: {
                files: {
                  disconnect: {
                    id,
                  },
                },
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

            return res.send(cleanFolder(nFolder));
          }

          return res.badRequest('Invalid delete type');
        }

        return res.send(cleanFolder(folder));
      },
    });

    done();
  },
  { name: PATH },
);
