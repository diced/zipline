import { ApiError } from '@/lib/api/errors';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerThumbnailsResponse = {
  status: string;
};

const logger = log('api').c('server').c('thumbnails');

export const PATH = '/api/server/thumbnails';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Manually trigger the thumbnails background task, optionally rerunning it for existing files (admin only).',
          body: z.object({
            rerun: z.boolean().default(false),
          }),
          response: {
            200: z.object({
              status: z.string(),
            }),
          },
        },
        preHandler: [userMiddleware, administratorMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const thumbnailTask = server.tasks.tasks.find((x) => x.id === 'thumbnails');
        if (!thumbnailTask) throw new ApiError(4011);

        thumbnailTask.logger.debug('manually running thumbnails task');

        await server.tasks.runJob(thumbnailTask.id, req.body.rerun);

        logger.info('thumbnails task manually run', {
          requester: req.user.username,
          rerun: !!req.body.rerun,
        });

        return res.send({
          status: `Thumbnails are being generated${
            req.body.rerun ? ' (rerun)' : ''
          }. This may take a while, check your logs for progress.`,
        });
      },
    );
  },
  { name: PATH },
);
