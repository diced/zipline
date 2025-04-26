import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { cleanFolder, Folder } from '@/lib/db/models/folder';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserFoldersIdResponse = Folder;

type Params = {
  id: string;
};

type Body = {
  id?: string;
  isPublic?: boolean;
  name?: string;
  allowUploads?: boolean;
  parentFolderId?: string;

  delete?: 'file' | 'folder';
};

const logger = log('api').c('user').c('folders').c('[id]');

export const PATH = '/api/user/folders/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
      Params: Params;
    }>({
      url: PATH,
      method: ['GET', 'PUT', 'PATCH', 'DELETE'],
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

        if (req.method === 'PUT') {
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

          logger.info('file added to folder', {
            folder: folder.id,
            file: id,
          });

          return res.send(cleanFolder(nFolder));
        } else if (req.method === 'PATCH') {
          const { isPublic, name, allowUploads, parentFolderId } = req.body;

          const nFolder = await prisma.folder.update({
            where: {
              id: folder.id,
            },
            data: {
              ...(isPublic !== undefined && { public: isPublic }),
              ...(name && { name }),
              ...(allowUploads !== undefined && { allowUploads }),
              ...(parentFolderId !== undefined && { parentFolderId }),
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

          logger.info('folder updated', {
            folder: folder.id,
            isPublic,
            name,
            allowUploads,
            parentFolderId
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

            logger.info('folder deleted', {
              folder: folder.id,
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

            logger.info('file removed from folder', {
              folder: folder.id,
              file: id,
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
