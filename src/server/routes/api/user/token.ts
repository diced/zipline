import { config } from '@/lib/config';
import { createToken, encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { userMiddleware } from '@/server/middleware/user';
import { getSession } from '@/server/session';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserTokenResponse = {
  user?: User;
  token?: string;
};

export const PATH = '/api/user/token';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
        select: {
          token: true,
        },
      });

      const token = encryptToken(user!.token, config.core.secret);

      return res.send({
        token,
      });
    });

    server.patch(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const session = await getSession(req, res);

      const user = await prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          token: createToken(),
        },
        select: {
          ...userSelect,
          token: true,
        },
      });

      session.user!.token = user.token;

      delete (user as any).password;

      return res.send({
        user,
        token: encryptToken(user.token, config.core.secret),
      });
    });

    done();
  },
  { name: PATH },
);
