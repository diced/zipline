import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';
import { version } from '../../../../package.json';

export type ApiVersionResponse = {
  version: string;
};

export const PATH = '/api/version';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, { preHandler: [userMiddleware, administratorMiddleware] }, async (_, res) => {
      return res.send({
        version,
      });
    });

    done();
  },
  { name: PATH },
);
