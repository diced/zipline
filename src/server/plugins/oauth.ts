import { config } from '@/lib/config';
import { createToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import Logger, { log } from '@/lib/logger';
import { findProvider } from '@/lib/oauth/providers';
import { OAuthProviderType, User } from '@/prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { getSession, saveSession, ZiplineIronSession } from '../session';
import { parseOAuthState } from '@/lib/oauth/state';
import { ApiError } from '@/lib/api/errors';

export type OAuthQuery = {
  state?: string;
  code: string;
  host: string;
  session: ZiplineIronSession;
};

export type OAuthResponse = {
  username: string;
  user_id: string;
  access_token: string;
  refresh_token?: string | null;
  avatar?: string | null;
};

async function oauthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('oauthHandle', oauthHandle);

  async function oauthHandle(
    this: FastifyRequest,
    reply: FastifyReply,
    provider: OAuthProviderType,
    handler: (query: OAuthQuery, logger: Logger) => Promise<OAuthResponse>,
  ) {
    const logger = log('api').c('auth').c('oauth').c(provider.toLowerCase());
    const session = await getSession(this, reply);

    const q = this.query as { state?: string; code?: string };
    const query: OAuthQuery = {
      state: q.state,
      code: q.code ?? '',
      host: this.headers.host ?? 'localhost:3000',
      session,
    };

    const response = await handler(query, logger);

    logger.debug('oauth response', {
      response,
    });

    const existingOauth = await prisma.oAuthProvider.findUnique({
      where: {
        provider_oauthId: {
          provider: provider,
          oauthId: response.user_id!,
        },
      },
    });

    const existingUser = await prisma.user.findFirst({
      where: {
        username: response.username!,
      },
      select: {
        id: true,
        username: true,
      },
    });

    const state = parseOAuthState(query.state);
    if (!state) throw new ApiError(1064);

    const user = await prisma.user.findFirst({
      where: {
        sessions: {
          some: {
            id: session.sessionId ?? '',
          },
        },
      },
      include: {
        oauthProviders: true,
      },
    });
    const userOauth = findProvider(provider, user?.oauthProviders ?? []);

    if (state.mode === 'link') {
      if (!user) throw new ApiError(2000);

      if (findProvider(provider, user.oauthProviders)) throw new ApiError(1063);

      logger.debug('attempting to link oauth account', {
        provider,
        user: user.id,
      });

      try {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            oauthProviders: {
              create: {
                provider: provider,
                accessToken: response.access_token!,
                refreshToken: response.refresh_token!,
                username: response.username!,
                oauthId: response.user_id!,
              },
            },
          },
        });

        await saveSession(session, user, false);

        logger.info('linked oauth account', {
          provider,
          user: user.id,
        });

        return reply.redirect('/dashboard/settings');
      } catch (e) {
        logger.error('failed to link oauth account', {
          provider,
          user: user.id,
          error: e,
        });

        throw new ApiError(1063);
      }
    } else if (user && userOauth) {
      await prisma.oAuthProvider.update({
        where: {
          id: userOauth.id,
        },
        data: {
          accessToken: response.access_token!,
          refreshToken: response.refresh_token!,
          username: response.username!,
          oauthId: response.user_id!,
        },
      });

      await saveSession(session, user, false);

      logger.info('updated oauth account', {
        provider,
        user: user.id,
      });

      return reply.redirect('/dashboard');
    } else if (existingOauth) {
      const login = await prisma.oAuthProvider.update({
        where: {
          id: existingOauth.id,
        },
        data: {
          accessToken: response.access_token!,
          refreshToken: response.refresh_token!,
          username: response.username!,
          oauthId: response.user_id!,
        },
        include: {
          user: true,
        },
      });

      if (session?.sessionId) session.destroy();

      await saveSession(session, <User>login.user!, false);

      logger.info('logged in with oauth', {
        provider,
        user: login.user!.id,
      });

      return reply.redirect('/dashboard');
    } else if (config.oauth.loginOnly) {
      logger.warn('user tried to create account with oauth, but login only is enabled', {
        oauth: response.username || 'unknown',
        ua: this.headers['user-agent'],
      });

      throw new ApiError(6009);
    } else if (existingUser) {
      throw new ApiError(6010);
    }

    try {
      const nuser = await prisma.user.create({
        data: {
          username: response.username!,
          token: createToken(),
          oauthProviders: {
            create: {
              provider: provider,
              accessToken: response.access_token!,
              refreshToken: response.refresh_token!,
              username: response.username!,
              oauthId: response.user_id!,
            },
          },
          avatar: response.avatar ?? null,
        },
      });

      await saveSession(session, <User>nuser, false);

      logger.info('created user with oauth', {
        provider,
        user: nuser.id,
      });

      return reply.redirect('/dashboard');
    } catch (e) {
      if ((e as { code: string }).code === 'P2002') {
        // already linked can't create, last failsafe lol
        logger.warn('user tried to create account with oauth, but already linked', {
          oauth: response.username || 'unknown',
          ua: this.headers['user-agent'],
        });
        logger.debug('oauth create error', {
          error: e,
          response,
        });

        throw new ApiError(1063);
      } else throw e;
    }
  }
}

export default fastifyPlugin(oauthPlugin, {
  name: 'oauth',
  fastify: '5.x',
});

declare module 'fastify' {
  interface FastifyRequest {
    oauthHandle: (
      reply: FastifyReply,
      provider: OAuthProviderType,
      handler: (query: OAuthQuery, logger: Logger) => Promise<OAuthResponse>,
    ) => void;
  }
}
