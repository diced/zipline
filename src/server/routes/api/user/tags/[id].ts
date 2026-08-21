import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { tagColumns, Tag, tagSchema } from '@/lib/db/models/tag';
import { tags as tagTable } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq } from 'drizzle-orm';
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
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const tag = await db.query.tags.findFirst({
          columns: tagColumns,
          where: { id, userId: req.user.id },
          with: { files: { columns: { id: true } } },
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
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const [deleted] = await db
          .delete(tagTable)
          .where(and(eq(tagTable.id, id), eq(tagTable.userId, req.user.id)))
          .returning({ id: tagTable.id });
        if (!deleted) throw new ApiError(9002);

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
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;
        const { name, color } = req.body;

        const existingTag = await db.query.tags.findFirst({
          columns: tagColumns,
          where: { id, userId: req.user.id },
          with: { files: { columns: { id: true } } },
        });
        if (!existingTag) throw new ApiError(9002);

        if (name) {
          const existing = await db.query.tags.findFirst({ columns: { id: true }, where: { name } });

          if (existing) throw new ApiError(1034);
        }

        const changes = { ...(name && { name }), ...(color && { color }) };
        let tag = existingTag;
        if (Object.keys(changes).length) {
          const [updated] = await db
            .update(tagTable)
            .set(changes)
            .where(eq(tagTable.id, existingTag.id))
            .returning({
              id: tagTable.id,
              createdAt: tagTable.createdAt,
              updatedAt: tagTable.updatedAt,
              name: tagTable.name,
              color: tagTable.color,
            });
          if (!updated) throw new ApiError(9002);
          tag = { ...updated, files: existingTag.files };
        }

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
