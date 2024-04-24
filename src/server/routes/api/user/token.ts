import { config } from '@/lib/config';
import { createToken, encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { loginToken } from '@/server/loginToken';
import { userMiddleware } from '@/server/middleware/user';
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

    server.patch(PATH, async (req, res) => {
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

      const token = loginToken(res, user);

      delete (user as any).token;

      return res.send({
        user,
        token,
      });
    });

    done();
  },
  { name: PATH },
);
