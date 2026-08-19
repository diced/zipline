import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import {
  removeFile,
  File,
  type FileUpdate,
  fileSchema,
  getFile,
  updateFileAndTags,
} from '@/lib/db/models/file';
import { files as fileTable } from '@/lib/db/schema';
import { listOwnedTags } from '@/lib/db/models/tag';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zValidatePath } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { eq } from 'drizzle-orm';

export type ApiUserFilesIdResponse = File;

const logger = log('api').c('user').c('files').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

export const PATH = '/api/user/files/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Fetch a single file owned by the authenticated user (or another user if permitted) by ID or short name.',
          params: paramsSchema,
          response: {
            200: fileSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await getFile(req.params.id, {
          thumbnail: true,
          tags: true,
          owner: true,
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.User?.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const { password: _password, User: _owner, ...responseFile } = file;
        return res.send(responseFile);
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          description:
            'Update metadata for a single file, including favorite, name, tags, password, and view limits.',
          params: paramsSchema,
          body: z.object({
            favorite: z.boolean().optional(),
            maxViews: z.number().min(0).optional(),
            password: z.string().nullish(),
            originalName: z.string().trim().min(1).optional().transform(zValidatePath),
            type: z.string().min(1).optional(),
            tags: z.array(z.string()).optional(),
            name: z.string().trim().min(1).optional().transform(zValidatePath),
            anonymous: z.boolean().optional(),
          }),
          response: {
            200: fileSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await getFile(req.params.id, {
          thumbnail: true,
          tags: true,
          owner: true,
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.User?.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const data: FileUpdate = {};

        if (req.body.favorite !== undefined) data.favorite = req.body.favorite;
        if (req.body.originalName !== undefined) data.originalName = req.body.originalName;
        if (req.body.type !== undefined) data.type = req.body.type;
        if (req.body.anonymous !== undefined) data.anonymous = req.body.anonymous;

        if (req.body.maxViews !== undefined) {
          data.maxViews = req.body.maxViews;
        }

        if (req.body.password !== undefined) {
          if (req.body.password === null || req.body.password === '') {
            data.password = null;
          } else {
            data.password = await hashPassword(req.body.password);
          }
        }

        if (req.body.tags !== undefined) {
          const tags = await listOwnedTags(
            req.body.tags,
            req.user.id !== file.User?.id ? (file.User?.id ?? req.user.id) : req.user.id,
          );

          if (tags.length !== req.body.tags.length) throw new ApiError(1032);
        }

        if (req.body.name !== undefined && req.body.name !== file.name) {
          const name = req.body.name!;
          const existingFile = await db.query.files.findFirst({
            columns: { id: true },
            where: eq(fileTable.name, name),
          });

          if (existingFile && existingFile.id !== file.id) throw new ApiError(1014);

          data.name = name;

          try {
            await datasource.rename(file.name, data.name);
          } catch (error) {
            logger.error('Failed to rename file in datasource', { error });
            throw new ApiError(6002);
          }
        }

        const newFile = await updateFileAndTags(file.id, data, req.body.tags);
        if (!newFile) throw new ApiError(4000);

        logger.info(`${req.user.username} updated file ${newFile.name}`, {
          updated: Object.keys(req.body),
          id: newFile.id,
          owner: file.User?.id,
        });

        const { password: _password, ...responseFile } = newFile;
        return res.send(responseFile);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          params: paramsSchema,
          response: {
            200: fileSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await getFile(req.params.id, {
          thumbnail: true,
          tags: true,
          owner: true,
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.User?.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const deleted = await removeFile(file.id);
        if (!deleted) throw new ApiError(4000);
        const { password: _password, User: _owner, ...deletedFile } = file;

        await datasource.delete(deletedFile.name);

        logger.info(`${req.user.username} deleted file ${deletedFile.name}`, {
          size: bytes(deletedFile.size),
          owner: file.User?.id,
        });

        return res.send(deletedFile);
      },
    );
  },
  { name: PATH },
);
