import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import { getSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiLogoutResponse = {
  loggedOut?: boolean;
};

const logger = log('api').c('auth').c('logout');

export const PATH = '/api/auth/logout';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Log out the currently authenticated user and invalidate their active session.',
          response: {
            200: z.object({
              loggedOut: z.boolean().optional(),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const current = await getSession(req, res);

        await prisma.userSession.deleteMany({
          where: {
            id: current.sessionId!,
            userId: req.user.id,
          },
        });

        current.destroy();

        logger.info('user logged out', {
          user: req.user.username,
          ip: req.ip ?? 'unknown',
          ua: req.headers['user-agent'],
        });

        return res.send({ loggedOut: true });
      },
    );
  },
  { name: PATH },
);
