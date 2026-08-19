import { ApiError } from '@/lib/api/errors';
import { datasource } from '@/lib/datasource';
import { fileBelongsToFolder, findFileById } from '@/lib/db/models/file';
import {
  buildParentChain,
  deleteFolderWithChildren,
  findFolderWithOwner,
  folderParentStatus,
  Folder,
  cleanFolder,
  folderSchema,
  getFolderDetails,
  moveFileToFolder,
  removeFileFromFolder,
  updateFolder,
} from '@/lib/db/models/folder';
import { log } from '@/lib/logger';
import { canManage } from '@/lib/role';
import { zQsBoolean, zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { FastifyRequest } from 'fastify';
import z from 'zod';

export type ApiUserFoldersIdResponse = Folder;

const logger = log('api').c('user').c('folders').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

const folderExistsAndEditable = async (req: FastifyRequest) => {
  const { id } = req.params as z.infer<typeof paramsSchema>;

  const folder = await findFolderWithOwner(id);

  if (!folder) throw new ApiError(4001);
  if (!canManage(req.user, folder.User)) throw new ApiError(4001);
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

        const folder = await getFolderDetails(id, !noincl);
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

        const file = await findFileById(id, {
          thumbnail: false,
          tags: false,
          owner: true,
        });
        if (!file) throw new ApiError(4000);
        if (!canManage(req.user, file.User)) throw new ApiError(4000);

        if (await fileBelongsToFolder(file.id, folderId)) throw new ApiError(1011);

        const nFolder = await moveFileToFolder(file.id, folderId);
        if (!nFolder) throw new ApiError(4002);

        logger.info('file added to folder', { folder: folderId, file: id });
        return res.send(cleanFolder(nFolder));
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
            const status = await folderParentStatus(folderId, parentId, req.user.id);
            if (status === 'missing') throw new ApiError(4007);
            if (status === 'foreign') throw new ApiError(3003);
            if (status === 'cycle') throw new ApiError(1016);
          }
        }

        const nFolder = await updateFolder(folderId, {
          ...(isPublic !== undefined && { public: isPublic }),
          ...(name && { name }),
          ...(allowUploads !== undefined && { allowUploads }),
          ...(parentId !== undefined && { parentId }),
        });
        if (!nFolder) throw new ApiError(4001);

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
            const targetFolder = await findFolderWithOwner(targetFolderId);
            if (!targetFolder) throw new ApiError(4008);
            if (!canManage(req.user, targetFolder.User)) throw new ApiError(4008, undefined, 403);
            if ((await folderParentStatus(folderId, targetFolderId, targetFolder.userId)) === 'cycle')
              throw new ApiError(1016);
          }

          try {
            const result = await deleteFolderWithChildren(folderId, childrenAction, targetFolderId);

            if (!result?.success) throw new ApiError(1019);

            if (result?.isCascade) {
              for (const name of result.fileNames) {
                await datasource.delete(name);
              }

              logger.info('folder cascade deleted', { folder: folderId, files: result.fileNames.length });
              return res.send({ success: true });
            }

            logger.info('folder deleted', { folder: folderId, childrenAction, targetFolderId });
            return res.send({ success: true });
          } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(4003);
          }
        } else if (del === 'file') {
          const { id } = req.body;
          if (!id) throw new ApiError(1013);

          const file = await findFileById(id, {
            thumbnail: false,
            tags: false,
            owner: true,
          });

          if (!file) throw new ApiError(4000);
          if (!canManage(req.user, file.User)) throw new ApiError(4000);

          if (!(await fileBelongsToFolder(file.id, folderId))) throw new ApiError(1012);

          const nFolder = await removeFileFromFolder(file.id, folderId);
          if (!nFolder) throw new ApiError(4002);

          logger.info('file removed from folder', { folder: nFolder.id, file: id });
          return res.send({ folder: cleanFolder(nFolder) });
        }
      },
    );
  },
  { name: PATH },
);
