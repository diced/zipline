import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiHealthcheckResponse = {
  pass: boolean;
};

const logger = log('api').c('healthcheck');

export const PATH = '/api/healthcheck';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          response: {
            200: z.object({
              pass: z.boolean(),
            }),
          },
        },
      },
      async (_, res) => {
        if (!config.features.healthcheck) return res.notFound();

        try {
          await prisma.$queryRaw`SELECT 1;`;
          return res.send({ pass: true });
        } catch (e) {
          logger.error('there was an error during a healthcheck').error(e as Error);
          return res.internalServerError('there was an error during a healthcheck');
        }
      },
    );
  },
  { name: PATH },
);
