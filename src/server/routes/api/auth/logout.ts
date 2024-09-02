import { userMiddleware } from '@/server/middleware/user';
import { getSession } from '@/server/session';
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
      handler: async (req, res) => {
        const session = await getSession(req, res);
        session.destroy();

        return res.send({ loggedOut: true });
      },
    });

    done();
  },
  { name: PATH },
);
