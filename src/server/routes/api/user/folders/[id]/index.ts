import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { User } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

export type ApiUserFoldersIdResponse = Folder;

// TODO: need to refactor interaction checks to use this function in the future
function checkInteraction(current?: Partial<User> | null, owner?: Partial<User> | null) {
  if (!current || !owner) return false;
  if (current.id === owner.id) return true;

  const can = canInteract(current.role, owner.role);

  return can;
}

const logger = log('api').c('user').c('folders').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

const folderExistsAndEditable = async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = req.params as z.infer<typeof paramsSchema>;

  const folder = await prisma.folder.findUnique({
    where: {
      id,
    },
    include: {
      User: true,
    },
  });
  if (!folder) return res.notFound('Folder not found');
  if (!checkInteraction(req.user, folder.User)) return res.notFound('Folder not found');
};

export const PATH = '/api/user/folders/:id';
export default typedPlugin(
  async (server) => {
    server.get(PATH, { schema: { params: paramsSchema }, preHandler: [userMiddleware] }, async (req, res) => {
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
          User: true,
          children: {
            orderBy: { createdAt: 'desc' },
            include: {
              _count: {
                select: { children: true, files: true },
              },
            },
          },
          parent: {
            select: { id: true, name: true, parentId: true },
          },
          _count: {
            select: { children: true, files: true },
          },
        },
      });
      if (!folder) return res.notFound('Folder not found');
      if (!checkInteraction(req.user, folder.User)) return res.notFound('Folder not found');

      return res.send(cleanFolder(folder));
    });

    server.put(
      PATH,
      {
        schema: {
          body: z.object({
            id: z.string(),
          }),
          params: paramsSchema,
        },
        preHandler: [userMiddleware, folderExistsAndEditable],
      },
      async (req, res) => {
        const { id: folderId } = req.params;
        const { id } = req.body;

        const file = await prisma.file.findUnique({
          where: {
            id,
          },
          include: {
            User: true,
          },
        });
        if (!file) return res.notFound('File not found');
        if (!checkInteraction(req.user, file.User)) return res.notFound('File not found');

        const fileInFolder = await prisma.file.findFirst({
          where: {
            id,
            Folder: {
              id: folderId,
            },
          },
        });
        if (fileInFolder) return res.badRequest('File already in folder');

        const nFolder = await prisma.folder.update({
          where: {
            id: folderId,
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
            User: true,
          },
        });

        logger.info('file added to folder', {
          folder: folderId,
          file: id,
        });

        return res.send(cleanFolder(nFolder));
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          body: z.object({
            isPublic: z.boolean().optional(),
            name: z.string().min(1).optional(),
            allowUploads: z.boolean().optional(),
            parentId: z.string().nullable().optional(),
          }),
          params: paramsSchema,
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id: folderId } = req.params;
        const { isPublic, name, allowUploads, parentId } = req.body;

        // Handle parentId change (moving folder)
        if (parentId !== undefined) {
          // Can't make a folder its own parent
          if (parentId === folderId) {
            return res.badRequest('A folder cannot be its own parent');
          }

          if (parentId !== null) {
            // Verify new parent exists and belongs to user
            const newParent = await prisma.folder.findUnique({
              where: { id: parentId },
              select: { id: true, userId: true, parentId: true },
            });

            if (!newParent) return res.notFound('Parent folder not found');
            if (newParent.userId !== req.user.id) return res.forbidden('Parent folder does not belong to you');

            // Check for circular reference - walk up the tree from new parent
            let currentParentId: string | null = newParent.parentId;
            while (currentParentId) {
              if (currentParentId === folderId) {
                return res.badRequest('Cannot move folder into one of its descendants');
              }
              const parent = await prisma.folder.findUnique({
                where: { id: currentParentId },
                select: { parentId: true },
              });
              currentParentId = parent?.parentId ?? null;
            }
          }
        }

        const nFolder = await prisma.folder.update({
          where: {
            id: folderId,
          },
          data: {
            ...(isPublic !== undefined && { public: isPublic }),
            ...(name && { name }),
            ...(allowUploads !== undefined && { allowUploads }),
            ...(parentId !== undefined && { parentId }),
          },
          include: {
            files: {
              select: {
                ...fileSelect,
                password: true,
              },
            },
            _count: {
              select: { children: true, files: true },
            },
            parent: {
              select: { id: true, name: true, parentId: true },
            },
          },
        });

        logger.info('folder updated', {
          folder: nFolder.id,
          isPublic,
          name,
          allowUploads,
          parentId,
        });

        return res.send(cleanFolder(nFolder));
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          body: z.object({
            delete: z.enum(['file', 'folder']),
            id: z.string().min(1).optional(),
          }),
          params: paramsSchema,
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id: folderId } = req.params;
        const { delete: del } = req.body;

        if (del === 'folder') {
          const nFolder = await prisma.folder.delete({
            where: {
              id: folderId,
            },
            include: {
              files: {
                select: {
                  ...fileSelect,
                  password: true,
                },
              },
              User: true,
            },
          });

          logger.info('folder deleted', {
            folder: nFolder.id,
          });

          return res.send(cleanFolder(nFolder));
        } else if (del === 'file') {
          const { id } = req.body;
          if (!id) return res.badRequest('File id is required');

          const file = await prisma.file.findUnique({
            where: {
              id,
            },
            include: {
              User: true,
            },
          });
          if (!file) return res.notFound('File not found');
          if (!checkInteraction(req.user, file.User)) return res.notFound('File not found');

          const fileInFolder = await prisma.file.findFirst({
            where: {
              id,
              Folder: {
                id: folderId,
              },
            },
          });
          if (!fileInFolder) return res.badRequest('File not in folder');

          const nFolder = await prisma.folder.update({
            where: {
              id: folderId,
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
            folder: nFolder.id,
            file: id,
          });

          return res.send(cleanFolder(nFolder));
        }
      },
    );
  },
  { name: PATH },
);
