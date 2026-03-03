import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { createToken, encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSchema, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserTokenResponse = {
  user?: User;
  token?: string;
};

const logger = log('api').c('user').c('token');

export const PATH = '/api/user/token';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Return an encrypted API token for the authenticated user.',
          response: {
            200: z.object({
              token: z.string().optional(),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const user = await prisma.user.findUnique({
          where: {
            id: req.user.id,
          },
          select: {
            token: true,
          },
        });

        if (!user || !user.token) {
          logger.warn('something went very wrong! user not found or token not found', {
            userId: req.user.id,
          });

          throw new ApiError(9004);
        }

        const token = encryptToken(user!.token, config.core.secret);

        return res.send({
          token,
        });
      },
    );

    server.patch(
      PATH,
      {
        preHandler: [userMiddleware],
        ...secondlyRatelimit(1),
        schema: {
          description:
            "Refresh the user's underlying token secret and return an updated token and user object.",
          response: {
            200: z.object({
              user: userSchema.optional(),
              token: z.string().optional(),
            }),
          },
        },
      },
      async (req, res) => {
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

        delete (user as any).password;

        logger.info('user reset their token', {
          user: user.username,
        });

        return res.send({
          user,
          token: encryptToken(user.token, config.core.secret),
        });
      },
    );
  },
  { name: PATH },
);
