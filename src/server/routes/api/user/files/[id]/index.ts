import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { File, fileSchema, fileSelect } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zValidatePath } from '@/lib/validation';
import { Prisma } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

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
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: {
            OR: [{ id: req.params.id }, { name: req.params.id }],
          },
          select: { User: true, ...fileSelect },
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.User?.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        return res.send(file);
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
          }),
          response: {
            200: fileSchema,
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: {
            OR: [{ id: req.params.id }, { name: req.params.id }],
          },
          select: { User: true, ...fileSelect },
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.User?.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const data: Prisma.FileUpdateInput = {};

        if (req.body.favorite !== undefined) data.favorite = req.body.favorite;
        if (req.body.originalName !== undefined) data.originalName = req.body.originalName;
        if (req.body.type !== undefined) data.type = req.body.type;

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
          const tags = await prisma.tag.findMany({
            where: {
              userId: req.user.id !== file.User?.id ? file.User?.id : req.user.id,
              id: {
                in: req.body.tags,
              },
            },
          });

          if (tags.length !== req.body.tags.length) throw new ApiError(1032);

          data.tags = {
            set: req.body.tags.map((tag) => ({ id: tag })),
          };
        }

        if (req.body.name !== undefined && req.body.name !== file.name) {
          const name = req.body.name!;
          const existingFile = await prisma.file.findFirst({
            where: {
              name,
            },
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

        const newFile = await prisma.file.update({
          where: {
            id: req.params.id,
          },
          data,
          select: fileSelect,
        });

        logger.info(`${req.user.username} updated file ${newFile.name}`, {
          updated: Object.keys(req.body),
          id: newFile.id,
          owner: file.User?.id,
        });

        return res.send(newFile);
      },
    );

    server.delete(
      PATH,
      {
        schema: { params: paramsSchema },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: {
            OR: [{ id: req.params.id }, { name: req.params.id }],
          },
          include: {
            User: true,
          },
        });
        if (!file) throw new ApiError(4000);

        if (req.user.id !== file.User?.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const deletedFile = await prisma.file.delete({
          where: {
            id: file.id,
          },
          select: fileSelect,
        });

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
