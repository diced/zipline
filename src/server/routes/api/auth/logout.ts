import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiLogoutResponse = {
  loggedOut?: boolean;
};

export const PATH = '/api/auth/logout';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['GET'],
      preHandler: [userMiddleware],
      handler: async (_, res) => {
        res.header('Set-Cookie', 'zipline_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT');

        return res.send({ loggedOut: true });
      },
    });

    done();
  },
  { name: PATH },
);
