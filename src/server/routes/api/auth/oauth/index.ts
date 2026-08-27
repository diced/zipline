import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { type OAuthProvider, oauthProviderSchema } from '@/lib/db/models/oauth';
import { getUser } from '@/lib/db/models/user';
import { oauthProviders, users } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq } from 'drizzle-orm';
import z from 'zod';

export type ApiAuthOauthResponse = OAuthProvider[];

const logger = log('api').c('auth').c('oauth');

export const PATH = '/api/auth/oauth';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List OAuth providers currently linked to the authenticated user.',
          response: {
            200: z.array(oauthProviderSchema),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        return res.send(req.user.oauthProviders);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description:
            'Unlink one OAuth provider from the authenticated user, enforcing that at least one login method remains.',
          body: z.object({ provider: oauthProviderSchema.shape.provider }),
          response: {
            200: z.array(oauthProviderSchema),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const [creds] = await db
          .select({ password: users.password })
          .from(users)
          .where(eq(users.id, req.user.id))
          .limit(1);

        if (!creds) throw new ApiError(9002);
        const { password } = creds;

        if (!req.user.oauthProviders.length) throw new ApiError(1030);
        if (req.user.oauthProviders.length === 1 && !password) throw new ApiError(1043);

        const { provider } = req.body;

        const user = await db.transaction(async (tx) => {
          await tx
            .delete(oauthProviders)
            .where(and(eq(oauthProviders.userId, req.user.id), eq(oauthProviders.provider, provider)));
          return getUser(req.user.id, tx);
        });
        if (!user) throw new ApiError(9002);

        logger.info(`${req.user.username} unlinked an oauth provider`, {
          provider,
        });

        return res.send(user.oauthProviders);
      },
    );
  },
  { name: PATH },
);
