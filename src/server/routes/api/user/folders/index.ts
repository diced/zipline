import { ApiError } from '@/lib/api/errors';
import { findFilesByIds } from '@/lib/db/models/file';
import {
  createFolderWithFiles,
  findFolderRowById,
  Folder,
  cleanFolder,
  cleanFolders,
  folderSchema,
  listFoldersForUser,
} from '@/lib/db/models/folder';
import { findUserRowById } from '@/lib/db/models/user';
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
          description:
            'List folders for the authenticated user, optionally including files or filtering by parent/root.',
          querystring: z.object({
            noincl: zQsBoolean.optional(),
            user: z.string().optional(),
            parentId: z.string().optional(),
            root: zQsBoolean.optional(),
          }),
          response: {
            200: z.array(folderSchema),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { noincl, user: userId, parentId, root } = req.query;

        if (userId) {
          const targetUser = await findUserRowById(userId);

          if (!targetUser) throw new ApiError(4009);
          if (req.user.id !== targetUser.id && !canInteract(req.user.role, targetUser.role))
            throw new ApiError(4009);
        }

        const folders = await listFoldersForUser(userId || req.user.id, {
          root,
          parentId,
          includeFiles: !noincl,
        });

        return res.send(cleanFolders(folders as unknown as Folder[]));
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description:
            'Create a new folder for the authenticated user, optionally public and/or seeded with files.',
          body: z.object({
            name: z.string().trim().min(1),
            isPublic: z.boolean().optional(),
            files: z.array(z.string()).optional(),
            parentId: z.string().optional(),
          }),
          response: {
            200: folderSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const { name, isPublic, parentId } = req.body;
        let files = req.body.files;

        if (parentId) {
          const parentFolder = await findFolderRowById(parentId);

          if (!parentFolder) throw new ApiError(4007);
          if (parentFolder.userId !== req.user.id) throw new ApiError(3003);
        }

        if (files) {
          const filesAdd = (await findFilesByIds(files, { thumbnail: false, tags: false })).filter(
            (file) => file.userId === req.user.id,
          );

          if (!filesAdd.length) throw new ApiError(1026);

          files = filesAdd.map((f) => f.id);
        }

        const folder = await createFolderWithFiles(
          {
            name,
            userId: req.user.id,
            ...(parentId && { parentId }),
            public: isPublic ?? false,
          },
          files ?? [],
        );

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
