import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { clearZeros, clearZerosFiles } from '@/lib/server-util/clearZeros';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerClearZerosResponse = {
  status?: string;
  files?: Awaited<ReturnType<typeof clearZerosFiles>>;
};

const logger = log('api').c('server').c('clear_zeros');

export const PATH = '/api/server/clear_zeros';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Scan for zero-byte files on disk and return the list of candidates to delete (admin only).',
          response: {
            200: z.object({
              files: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                }),
              ),
            }),
          },
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (_, res) => {
        const files = await clearZerosFiles();

        return res.send({ files });
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description:
            'Delete zero-byte files previously detected on disk and return a short status message (admin only).',
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
        const files = await clearZerosFiles();
        const status = await clearZeros(files);

        logger.info('cleared zero-byte files', {
          files: files.length,
          status,
          requester: req.user.username,
        });

        return res.send({ status });
      },
    );
  },
  { name: PATH },
);
