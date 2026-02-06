import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { buildParentChain, Folder, cleanFolder } from '@/lib/db/models/folder';
import { User } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zStringTrimmed } from '@/lib/validation';
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

      if (folder.parentId) {
        (folder as any).parent = await buildParentChain(folder.parentId);
      }

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
            name: zStringTrimmed.optional(),
            allowUploads: z.boolean().optional(),
            parentId: z.string().nullish(),
          }),
          params: paramsSchema,
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id: folderId } = req.params;
        const { isPublic, name, allowUploads, parentId } = req.body;

        if (parentId !== undefined) {
          if (parentId === folderId) {
            return res.badRequest('A folder cannot be its own parent');
          }

          if (parentId !== null) {
            const newParent = await prisma.folder.findUnique({
              where: { id: parentId },
              select: { id: true, userId: true, parentId: true },
            });

            if (!newParent) return res.notFound('Parent folder not found');
            if (newParent.userId !== req.user.id)
              return res.forbidden('Parent folder does not belong to you');

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
            id: zStringTrimmed.optional(),
            childrenAction: z.enum(['moveToRoot', 'moveToFolder', 'cascade']).optional(),
            targetFolderId: z.string().optional(),
          }),
          params: paramsSchema,
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id: folderId } = req.params;
        const { delete: del, childrenAction, targetFolderId } = req.body;

        if (del === 'folder') {
          if (childrenAction === 'moveToFolder' && targetFolderId) {
            const targetFolder = await prisma.folder.findUnique({
              where: { id: targetFolderId },
              select: { id: true, userId: true },
            });
            if (!targetFolder) return res.notFound('Target folder not found');
            if (targetFolder.userId !== req.user.id)
              return res.forbidden('Target folder does not belong to you');
          }

          if (childrenAction === 'moveToRoot') {
            await prisma.folder.updateMany({
              where: { parentId: folderId },
              data: { parentId: null },
            });
            await prisma.file.updateMany({
              where: { folderId: folderId },
              data: { folderId: null },
            });
          } else if (childrenAction === 'moveToFolder' && targetFolderId) {
            await prisma.folder.updateMany({
              where: { parentId: folderId },
              data: { parentId: targetFolderId },
            });
            await prisma.file.updateMany({
              where: { folderId: folderId },
              data: { folderId: targetFolderId },
            });
          } else if (childrenAction === 'cascade') {
            const deleteRecursive = async (id: string) => {
              const children = await prisma.folder.findMany({
                where: { parentId: id },
                select: { id: true },
              });
              for (const child of children) {
                await deleteRecursive(child.id);
              }
              await prisma.folder.delete({ where: { id } });
            };
            await deleteRecursive(folderId);
          }

          if (!childrenAction || childrenAction !== 'cascade') {
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
              childrenAction: childrenAction || 'default',
            });

            return res.send(cleanFolder(nFolder));
          } else {
            logger.info('folder cascade deleted', {
              folder: folderId,
            });
            return res.send({ success: true });
          }
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
