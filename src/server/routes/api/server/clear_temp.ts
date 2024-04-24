import { clearTemp } from '@/lib/server-util/clearTemp';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiServerClearTempResponse = {
  status?: string;
};

export const PATH = '/api/server/clear_temp';
export default fastifyPlugin(
  (server, _, done) => {
    server.delete(
      PATH,
      {
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (_, res) => {
        const status = await clearTemp();

        return res.send({ status });
      },
    );

    done();
  },
  { name: PATH },
);
