import { clearZeros, clearZerosFiles } from '@/lib/server-util/clearZeros';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiServerClearZerosResponse = {
  status?: string;
  files?: Awaited<ReturnType<typeof clearZerosFiles>>;
};

export const PATH = '/api/server/clear_zeros';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(
      PATH,
      {
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
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (_, res) => {
        const files = await clearZerosFiles();
        const status = await clearZeros(files);

        return res.send({ status });
      },
    );

    done();
  },
  { name: PATH },
);
