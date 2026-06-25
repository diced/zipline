import { ApiError } from '@/lib/api/errors';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { buildParentChain, Folder, cleanFolder, folderSchema } from '@/lib/db/models/folder';
import { User } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zQsBoolean, zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { FastifyRequest } from 'fastify';
import z from 'zod';

export type ApiUserFoldersIdResponse = Folder;

// TODO: need to refactor interaction checks to use this function in the future
export function checkInteraction(current?: Partial<User> | null, owner?: Partial<User> | null) {
  if (!current || !owner) return false;
  if (current.id === owner.id) return true;

  const can = canInteract(current.role, owner.role);

  return can;
}

const logger = log('api').c('user').c('folders').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

const folderMutationInclude = {
  _count: { select: { children: true, files: true } },
  parent: { select: { id: true, name: true, parentId: true } },
} as const;

const folderExistsAndEditable = async (req: FastifyRequest) => {
  const { id } = req.params as z.infer<typeof paramsSchema>;

  const folder = await prisma.folder.findUnique({
    where: {
      id,
    },
    include: {
      User: true,
    },
  });

  if (!folder) throw new ApiError(4001);
  if (!checkInteraction(req.user, folder.User)) throw new ApiError(4001);
};

export const PATH = '/api/user/folders/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Fetch a specific folder by ID, optionally including files, children, and its parent chain.',
          params: paramsSchema,
          querystring: z.object({
            noincl: zQsBoolean.optional(),
          }),
          response: {
            200: folderSchema.partial(),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, folderExistsAndEditable],
      },
      async (req, res) => {
        const { id } = req.params;
        const { noincl } = req.query;

        const folder = await prisma.folder.findUnique({
          where: {
            id,
          },
          include: {
            ...(!noincl && {
              files: {
                select: {
                  ...fileSelect,
                  password: true,
                },
              },
            }),
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
        if (!folder) throw new ApiError(4001);

        if (folder.parentId) {
          (folder as any).parent = await buildParentChain(folder.parentId);
        }

        return res.send(cleanFolder(folder as unknown as Partial<Folder>));
      },
    );

    server.put(
      PATH,
      {
        schema: {
          description: 'Add a file to a specific folder owned by the user.',
          body: z.object({
            id: z.string(),
          }),
          params: paramsSchema,
          response: {
            200: folderSchema.partial(),
          },
          tags: ['auth'],
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
        if (!file) throw new ApiError(4000);
        if (!checkInteraction(req.user, file.User)) throw new ApiError(4000);

        const fileInFolder = await prisma.file.findFirst({
          where: {
            id,
            Folder: {
              id: folderId,
            },
          },
        });
        if (fileInFolder) throw new ApiError(1011);

        try {
          const nFolder = await prisma.folder.update({
            where: { id: folderId },
            data: {
              files: { connect: { id } },
            },
            include: folderMutationInclude,
          });

          logger.info('file added to folder', { folder: folderId, file: id });
          return res.send(cleanFolder(nFolder));
        } catch (error: any) {
          if (error.code === 'P2025') throw new ApiError(4002);
          throw error;
        }
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          description: "Update a folder's visibility, name, upload permissions, or parent.",
          body: z.object({
            isPublic: z.boolean().optional(),
            name: zStringTrimmed.optional(),
            allowUploads: z.boolean().optional(),
            parentId: z.string().nullish(),
          }),
          params: paramsSchema,
          response: {
            200: folderSchema.partial(),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, folderExistsAndEditable],
      },
      async (req, res) => {
        const { id: folderId } = req.params;
        const { isPublic, name, allowUploads, parentId } = req.body;

        if (parentId !== undefined) {
          if (parentId === folderId) throw new ApiError(1015);

          if (parentId !== null) {
            const newParent = await prisma.folder.findUnique({
              where: { id: parentId },
              select: { id: true, userId: true, parentId: true },
            });

            if (!newParent) throw new ApiError(4007);
            if (newParent.userId !== req.user.id) throw new ApiError(3003);

            let currentParentId: string | null = newParent.parentId;
            while (currentParentId) {
              if (currentParentId === folderId) {
                throw new ApiError(1016);
              }
              const parent = await prisma.folder.findUnique({
                where: { id: currentParentId },
                select: { parentId: true },
              });
              currentParentId = parent?.parentId ?? null;
            }
          }
        }

        try {
          const nFolder = await prisma.folder.update({
            where: { id: folderId },
            data: {
              ...(isPublic !== undefined && { public: isPublic }),
              ...(name && { name }),
              ...(allowUploads !== undefined && { allowUploads }),
              ...(parentId !== undefined && { parentId }),
            },
            include: folderMutationInclude,
          });

          logger.info('folder updated', {
            folder: nFolder.id,
            isPublic,
            name,
            allowUploads,
            parentId,
          });

          return res.send(cleanFolder(nFolder));
        } catch (error: any) {
          if (error.code === 'P2025') throw new ApiError(4001);
          throw error;
        }
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          body: z.object({
            delete: z.enum(['file', 'folder']),
            id: zStringTrimmed.optional(),

            childrenAction: z.enum(['root', 'folder', 'cascade', 'cascade-files']).optional(),
            targetFolderId: z.string().optional(),
          }),
          params: paramsSchema,
          response: {
            200: z.object({
              success: z.boolean().nullish().describe('if deleting the folder, return success status'),
              folder: folderSchema
                .partial()
                .nullish()
                .describe('if deleting a file from the folder, returns the updated folder'),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, folderExistsAndEditable],
      },
      async (req, res) => {
        const { id: folderId } = req.params;
        const { delete: del, childrenAction, targetFolderId } = req.body;

        if (del === 'folder') {
          if (childrenAction === 'folder' && targetFolderId) {
            const targetFolder = await prisma.folder.findUnique({
              where: { id: targetFolderId },
              select: { id: true, User: true },
            });
            if (!targetFolder) throw new ApiError(4008);
            if (!checkInteraction(req.user, targetFolder.User)) throw new ApiError(4008, undefined, 403);
          }

          try {
            const toDeleteFiles: string[] = [];

            const result = await prisma.$transaction(async (tx) => {
              if (!childrenAction) {
                return { success: true };
              }

              if (childrenAction === 'root') {
                await tx.folder.updateMany({ where: { parentId: folderId }, data: { parentId: null } });
                await tx.file.updateMany({ where: { folderId: folderId }, data: { folderId: null } });

                return { success: true };
              } else if (childrenAction === 'folder' && targetFolderId) {
                await tx.folder.updateMany({
                  where: { parentId: folderId },
                  data: { parentId: targetFolderId },
                });
                await tx.file.updateMany({
                  where: { folderId: folderId },
                  data: { folderId: targetFolderId },
                });

                return { success: true };
              } else if (childrenAction === 'cascade' || childrenAction === 'cascade-files') {
                const deleteFiles = childrenAction === 'cascade-files';

                const deleteRecursive = async (id: string) => {
                  const children = await tx.folder.findMany({
                    where: { parentId: id },
                    select: { id: true },
                  });
                  for (const child of children) {
                    await deleteRecursive(child.id);
                  }

                  if (deleteFiles) {
                    const files = await tx.file.findMany({
                      where: { folderId: id },
                      select: { name: true },
                    });
                    toDeleteFiles.push(...files.map((f) => f.name));
                    await tx.file.deleteMany({ where: { folderId: id } });
                  }

                  await tx.folder.delete({ where: { id } });
                };

                await deleteRecursive(folderId);

                return { success: true, isCascade: true };
              }
            });

            if (!result?.success) throw new ApiError(1019);

            if (result?.isCascade) {
              for (const name of toDeleteFiles) {
                await datasource.delete(name);
              }

              logger.info('folder cascade deleted', { folder: folderId, files: toDeleteFiles.length });
              return res.send({ success: true });
            } else {
              await prisma.folder.delete({ where: { id: folderId } });
            }

            logger.info('folder deleted', { folder: folderId, childrenAction, targetFolderId });
            return res.send({ success: true });
          } catch (error: any) {
            if (error.code === 'P2025') throw new ApiError(4003);
            throw error;
          }
        } else if (del === 'file') {
          const { id } = req.body;
          if (!id) throw new ApiError(1013);

          const file = await prisma.file.findUnique({
            where: { id },
            include: { User: true },
          });

          if (!file) throw new ApiError(4000);
          if (!checkInteraction(req.user, file.User)) throw new ApiError(4000);

          const fileInFolder = await prisma.file.findFirst({
            where: {
              id,
              Folder: { id: folderId },
            },
          });
          if (!fileInFolder) throw new ApiError(1012);

          try {
            const nFolder = await prisma.folder.update({
              where: { id: folderId },
              data: {
                files: { disconnect: { id } },
              },
              include: folderMutationInclude,
            });

            logger.info('file removed from folder', { folder: nFolder.id, file: id });
            return res.send({ folder: cleanFolder(nFolder) });
          } catch (error: any) {
            if (error.code === 'P2025') throw new ApiError(4002);
            throw error;
          }
        }
      },
    );
  },
  { name: PATH },
);
