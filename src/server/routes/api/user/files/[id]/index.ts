import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import {
  File,
  fileColumns,
  fileRelations,
  fileSchema,
  getFile,
  removeFile,
  type FileUpdate,
} from '@/lib/db/models/file';
import { files, filesToTags, tags } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zValidatePath } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { and, eq, inArray } from 'drizzle-orm';

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
        const file = await getFile(req.params.id);
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.user?.id && !canInteract(req.user.role, file.user?.role ?? 'USER'))
          throw new ApiError(4000);

        const { user: _owner, ...responseFile } = file;
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
        const file = await getFile(req.params.id);
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.user?.id && !canInteract(req.user.role, file.user?.role ?? 'USER'))
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
          const ownerId = req.user.id !== file.user?.id ? (file.user?.id ?? req.user.id) : req.user.id;
          const tagCount = await db.$count(
            tags,
            and(eq(tags.userId, ownerId), inArray(tags.id, req.body.tags)),
          );

          if (tagCount !== req.body.tags.length) throw new ApiError(1032);
        }

        if (req.body.name !== undefined && req.body.name !== file.name) {
          const name = req.body.name!;
          const existingFile = await db.query.files.findFirst({ columns: { id: true }, where: { name } });

          if (existingFile && existingFile.id !== file.id) throw new ApiError(1014);

          data.name = name;

          try {
            await datasource.rename(file.name, data.name);
          } catch (error) {
            logger.error('Failed to rename file in datasource', { error });
            throw new ApiError(6002);
          }
        }

        const newFile = await db.transaction(async (tx) => {
          if (Object.keys(data).length) {
            const [updated] = await tx
              .update(files)
              .set(data)
              .where(eq(files.id, file.id))
              .returning({ id: files.id });
            if (!updated) return null;
          }

          if (req.body.tags !== undefined) {
            await tx.delete(filesToTags).where(eq(filesToTags.fileId, file.id));

            if (req.body.tags.length) {
              await tx
                .insert(filesToTags)
                .values(req.body.tags.map((tagId) => ({ fileId: file.id, tagId })))
                .onConflictDoNothing();
            }
          }

          return tx.query.files.findFirst({
            columns: fileColumns,
            where: { id: file.id },
            with: fileRelations,
          });
        });
        if (!newFile) throw new ApiError(4000);

        logger.info(`${req.user.username} updated file ${newFile.name}`, {
          updated: Object.keys(req.body),
          id: newFile.id,
          owner: file.user?.id,
        });

        return res.send(newFile);
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
        const file = await getFile(req.params.id);
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.user?.id && !canInteract(req.user.role, file.user?.role ?? 'USER'))
          throw new ApiError(4000);

        const deleted = await removeFile(file.id);
        if (!deleted) throw new ApiError(4000);
        const { user: _owner, ...deletedFile } = file;

        await datasource.delete(deletedFile.name);

        logger.info(`${req.user.username} deleted file ${deletedFile.name}`, {
          size: bytes(deletedFile.size),
          owner: file.user?.id,
        });

        return res.send(deletedFile);
      },
    );
  },
  { name: PATH },
);
