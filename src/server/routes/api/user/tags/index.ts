import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { tagColumns, Tag, tagSchema } from '@/lib/db/models/tag';
import { tags } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserTagsResponse = Tag | Tag[];

const logger = log('api').c('user').c('tags');

export const PATH = '/api/user/tags';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List all tags created by the authenticated user.',
          response: {
            200: z.array(tagSchema),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const tagList = await db.query.tags.findMany({
          columns: tagColumns,
          where: { userId: req.user.id },
          with: { files: { columns: { id: true } } },
        });

        return res.send(tagList);
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Create a new tag with a name and color for organizing files.',
          body: z.object({
            name: zStringTrimmed,
            color: z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/),
          }),
          response: {
            200: tagSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const { name, color } = req.body;

        const [row] = await db
          .insert(tags)
          .values({ name, color, userId: req.user.id })
          .onConflictDoNothing({ target: tags.name })
          .returning({
            id: tags.id,
            createdAt: tags.createdAt,
            updatedAt: tags.updatedAt,
            name: tags.name,
            color: tags.color,
          });
        if (!row) throw new ApiError(1033);
        const tag = { ...row, files: [] };

        logger.info('tag created', {
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
