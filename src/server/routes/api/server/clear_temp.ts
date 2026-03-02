import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { clearTemp } from '@/lib/server-util/clearTemp';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerClearTempResponse = {
  status?: string;
};

const logger = log('api').c('server').c('clear_temp');

export const PATH = '/api/server/clear_temp';
export default typedPlugin(
  async (server) => {
    server.delete(
      PATH,
      {
        schema: {
          description:
            'Delete temporary files on the Zipline server and return a short status message (admin only).',
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
        const status = await clearTemp();

        logger.info('cleared temp files', {
          status,
          requester: req.user.username,
        });

        return res.send({ status });
      },
    );
  },
  { name: PATH },
);
