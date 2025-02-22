import { config } from '@/lib/config';
import { createToken, decrypt } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import Logger, { log } from '@/lib/logger';
import { findProvider } from '@/lib/oauth/providerUtil';
import { OAuthProviderType, User } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { getSession, saveSession } from '../session';

export interface OAuthQuery {
  state?: string;
  code: string;
  host: string;
}

export interface OAuthResponse {
  username?: string;
  user_id?: string;
  access_token?: string;
  refresh_token?: string;
  avatar?: string | null;

  error?: string;
  error_code?: number;
  redirect?: string;
}

async function oauthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('oauthHandle', oauthHandle);

  async function oauthHandle(
    this: FastifyRequest,
    reply: FastifyReply,
    provider: OAuthProviderType,
    handler: (query: OAuthQuery, logger: Logger) => Promise<OAuthResponse>,
  ) {
    const logger = log('api').c('auth').c('oauth').c(provider.toLowerCase());

    (this.query as any).host = this.headers.host ?? 'localhost:3000';

    const response = await handler(this.query as OAuthQuery, logger);
    const session = await getSession(this, reply);

    if (response.error) {
      logger.warn('invalid oauth request', {
        error: response.error,
      });
      return reply.internalServerError(response.error_code + ' ' + response.error);
    }

    if (response.redirect) {
      return reply.redirect(response.redirect);
    }

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

    const { state } = this.query as OAuthQuery;

    const user = await prisma.user.findFirst({
      where: {
        sessions: {
          has: session.sessionId ?? '',
        },
      },
      include: {
        oauthProviders: true,
      },
    });

    const userOauth = findProvider(provider, user?.oauthProviders ?? []);

    let urlState;
    try {
      urlState = decrypt(decodeURIComponent(state ?? ''), config.core.secret);
    } catch {
      urlState = null;
    }

    if (urlState === 'link') {
      if (!user) return reply.unauthorized('invalid session');

      if (findProvider(provider, user.oauthProviders))
        return reply.badRequest('This account is already linked to this provider');

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

        await saveSession(session, user);

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

        return reply.badRequest('Cant link account, already linked with this provider');
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
      return reply.badRequest("Can't create users through oauth.");
    } else if (existingUser) {
      return reply.badRequest('This username is already taken');
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

      await saveSession(session, <User>nuser);

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

        return reply.badRequest('Cant create user, already linked with this provider');
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
