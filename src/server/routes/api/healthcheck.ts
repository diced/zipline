import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import fastifyPlugin from 'fastify-plugin';

export type ApiHealthcheckResponse = {
  pass: boolean;
};

const logger = log('api').c('healthcheck');

export const PATH = '/api/healthcheck';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, async (_, res) => {
      if (!config.features.healthcheck) return res.notFound();

      try {
        await prisma.$queryRaw`SELECT 1;`;
        return res.send({ pass: true });
      } catch (e) {
        logger.error('there was an error during a healthcheck').error(e as Error);
        return res.internalServerError('there was an error during a healthcheck');
      }
    });

    done();
  },
  { name: PATH },
);
