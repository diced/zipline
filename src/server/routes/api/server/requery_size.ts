import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { requerySize } from '@/lib/server-util/requerySize';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerRequerySizeResponse = {
  status?: string;
};

const logger = log('api').c('server').c('requery_size');

export const PATH = '/api/server/requery_size';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Re-scan stored files to update their sizes and optionally delete missing ones, returning a short status message (admin only).',
          body: z.object({
            forceDelete: z.boolean().default(false),
            forceUpdate: z.boolean().default(false),
          }),
          response: {
            200: z.object({
              status: z.string().optional(),
            }),
          },
        },
        preHandler: [userMiddleware, administratorMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const { forceDelete, forceUpdate } = req.body;
        const status = await requerySize({
          forceDelete,
          forceUpdate,
        });

        logger.info('requerying size', {
          status,
          requester: req.user.username,
          forceDelete,
          forceUpdate,
        });

        return res.send({ status });
      },
    );
  },
  { name: PATH },
);
