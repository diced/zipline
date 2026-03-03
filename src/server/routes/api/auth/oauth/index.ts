import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { OAuthProvider, oauthProviderSchema } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
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
        const { password } = (await prisma.user.findFirst({
          where: {
            id: req.user.id,
          },
          select: {
            password: true,
          },
        }))!;

        if (!req.user.oauthProviders.length) throw new ApiError(1030);
        if (req.user.oauthProviders.length === 1 && !password) throw new ApiError(1043);

        const { provider } = req.body;

        const providers = await prisma.user.update({
          where: {
            id: req.user.id,
          },
          data: {
            oauthProviders: {
              deleteMany: [{ provider }],
            },
          },
          include: {
            oauthProviders: true,
          },
        });

        logger.info(`${req.user.username} unlinked an oauth provider`, {
          provider,
        });

        return res.send(providers.oauthProviders);
      },
    );
  },
  { name: PATH },
);
