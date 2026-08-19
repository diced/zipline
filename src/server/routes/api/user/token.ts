import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { createToken, encryptToken } from '@/lib/crypto';
import { db } from '@/lib/db';
import { updateUser, type User, userSchema } from '@/lib/db/models/user';
import { users } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { eq } from 'drizzle-orm';
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
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const user = await db.query.users.findFirst({
          columns: { token: true },
          where: eq(users.id, req.user.id),
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
          tags: ['auth'],
        },
      },
      async (req, res) => {
        const token = createToken();
        const user = await updateUser(req.user.id, { token });
        if (!user) throw new ApiError(9004);

        logger.info('user reset their token', {
          user: user.username,
        });

        return res.send({
          user,
          token: encryptToken(token, config.core.secret),
        });
      },
    );
  },
  { name: PATH },
);
