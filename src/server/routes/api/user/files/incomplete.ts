import { db } from '@/lib/db';
import { IncompleteFile, incompleteFileSchema } from '@/lib/db/models/incompleteFile';
import { incompleteFiles } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { and, eq, inArray } from 'drizzle-orm';

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
        const pendingFiles = await db.query.incompleteFiles.findMany({
          where: { userId: req.user.id },
        });

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
        let removed: { id: string }[] = [];
        if (req.body.id.length)
          removed = await db
            .delete(incompleteFiles)
            .where(and(eq(incompleteFiles.userId, req.user.id), inArray(incompleteFiles.id, req.body.id)))
            .returning({ id: incompleteFiles.id });
        const count = removed.length;
        const result = { count };

        logger.info('incomplete files deleted', {
          count: result.count,
          user: req.user.username,
        });

        return res.send(result);
      },
    );
  },
  { name: PATH },
);
