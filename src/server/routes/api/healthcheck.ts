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
          description:
            'Perform a simple healthcheck on the database and backend of Zipline. Returns a simple pass/fail response.',
          response: {
            200: z.object({
              pass: z.boolean().describe('true if the server and db are reachable and functioning.'),
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
