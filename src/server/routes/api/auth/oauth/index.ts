import { log } from '@/lib/logger';
import fastifyPlugin from 'fastify-plugin';
import { OAuthProvider, OAuthProviderType } from '@prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import { prisma } from '@/lib/db';

export type ApiAuthOauthResponse = OAuthProvider[];

type Body = {
  provider?: OAuthProviderType;
};

const logger = log('api').c('auth').c('oauth');

export const PATH = '/api/auth/oauth/oidc';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      return res.send(req.user.oauthProviders);
    });

    server.delete<{ Body: Body }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const { password } = (await prisma.user.findFirst({
        where: {
          id: req.user.id,
        },
        select: {
          password: true,
        },
      }))!;

      if (!req.user.oauthProviders.length) return res.badRequest('No providers to delete');
      if (req.user.oauthProviders.length === 1 && !password)
        return res.badRequest("You can't delete your last oauth provider without a password");

      const { provider } = req.body;
      if (!provider) return res.badRequest('Provider is required');

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
    });

    done();
  },
  { name: PATH },
);
