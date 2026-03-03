import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { Tag, tagSchema, tagSelect } from '@/lib/db/models/tag';
import { log } from '@/lib/logger';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserTagsIdResponse = Tag;

const logger = log('api').c('user').c('tags').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

export const PATH = '/api/user/tags/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Fetch a specific tag by ID, ensuring it is owned by the authenticated user.',
          params: paramsSchema,
          response: {
            200: tagSchema,
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const tag = await prisma.tag.findFirst({
          where: {
            userId: req.user.id,
            id,
          },
          select: tagSelect,
        });
        if (!tag) throw new ApiError(9002);

        return res.send(tag);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Delete a specific tag owned by the authenticated user.',
          params: paramsSchema,
          response: {
            200: z.object({
              success: z.boolean(),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const tag = await prisma.tag.deleteMany({
          where: {
            userId: req.user.id,
            id,
          },
        });

        if (tag.count === 0) throw new ApiError(9002);

        logger.info('tag deleted', {
          id,
          user: req.user.username,
        });

        return res.send({ success: true });
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          description: 'Update the name and/or color of a specific tag.',
          params: paramsSchema,
          body: z.object({
            name: zStringTrimmed.optional(),
            color: z
              .string()
              .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
              .optional(),
          }),
          response: {
            200: tagSchema,
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;
        const { name, color } = req.body;

        const existingTag = await prisma.tag.findFirst({
          where: {
            userId: req.user.id,
            id,
          },
        });
        if (!existingTag) throw new ApiError(9002);

        if (name) {
          const existing = await prisma.tag.findFirst({
            where: {
              name,
            },
          });

          if (existing) throw new ApiError(1034);
        }

        const tag = await prisma.tag.update({
          where: {
            id: existingTag.id,
          },
          data: {
            ...(name && { name }),
            ...(color && { color }),
          },
          select: tagSelect,
        });

        logger.info('tag updated', {
          id: tag.id,
          name: tag.name,
          user: req.user.username,
        });

        return res.send(tag);
      },
    );
  },
  { name: PATH },
);
