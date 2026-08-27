import { db } from '@/lib/db';
import { IncompleteFile, incompleteFileSchema } from '@/lib/db/models/incompleteFile';
import { incompleteFiles } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { ApiError } from '@/lib/api/errors';

export type ApiUserFilesIncompleteResponse = IncompleteFile[] | { count: number };

const logger = log('api').c('user').c('files').c('incomplete');

export const PATH = '/api/user/files/incomplete';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List incomplete or still-processing file uploads for the authenticated user.',
          response: {
            200: z.array(incompleteFileSchema),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const pendingFiles = await db
          .select()
          .from(incompleteFiles)
          .where(eq(incompleteFiles.userId, req.user.id));

        return res.send(pendingFiles);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Delete one or more incomplete file records owned by the authenticated user.',
          body: z.object({
            id: z.array(z.string()),
          }),
          response: {
            200: z.object({
              count: z.number(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        if (!req.body.id.length) throw new ApiError(1027);

        const removed = await db
          .delete(incompleteFiles)
          .where(and(eq(incompleteFiles.userId, req.user.id), inArray(incompleteFiles.id, req.body.id)))
          .returning({ id: incompleteFiles.id });

        logger.info('incomplete files deleted', {
          count: removed.length,
          user: req.user.username,
        });

        return res.send({ count: removed.length });
      },
    );
  },
  { name: PATH },
);
