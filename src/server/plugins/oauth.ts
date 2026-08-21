import { config } from '@/lib/config';
import { createToken } from '@/lib/crypto';
import { db } from '@/lib/db';
import { type OAuthProviderType } from '@/lib/db/enums';
import { createUser, getUser, getUserBySession, usernameExists } from '@/lib/db/models/user';
import { oauthProviders } from '@/lib/db/schema';
import { isPostgresError } from '@/lib/db/utils';
import Logger, { log } from '@/lib/logger';
import { findProvider } from '@/lib/oauth/providers';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { getSession, saveSession, ZiplineIronSession } from '../session';
import { parseOAuthState } from '@/lib/oauth/state';
import { ApiError } from '@/lib/api/errors';
import { eq } from 'drizzle-orm';

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

function safeOAuthResponse(response: OAuthResponse) {
  return {
    ...response,
    access_token: '[redacted]',
    ...(response.refresh_token !== undefined && {
      refresh_token: response.refresh_token ? '[redacted]' : response.refresh_token,
    }),
  };
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
      response: safeOAuthResponse(response),
    });

    const existingOauth = await db.query.oauthProviders.findFirst({
      columns: { id: true, userId: true },
      where: { provider, oauthId: response.user_id },
    });
    const existingUser = await usernameExists(response.username);

    const state = parseOAuthState(query.state);
    if (!state) throw new ApiError(1064);

    if (!state.nonce || !session.oauthState || state.nonce !== session.oauthState) {
      logger.warn('oauth state nonce mismatch!!', {
        provider,
        ua: this.headers['user-agent'],
      });

      throw new ApiError(1064);
    }

    delete session.oauthState;
    await session.save();

    const user = session.sessionId ? await getUserBySession(session.sessionId) : null;
    const userOauth = findProvider(provider, user?.oauthProviders ?? []);

    if (state.mode === 'link') {
      if (!user) throw new ApiError(2000);

      if (findProvider(provider, user.oauthProviders)) throw new ApiError(1063);

      logger.debug('attempting to link oauth account', {
        provider,
        user: user.id,
      });

      try {
        const [createdProvider] = await db
          .insert(oauthProviders)
          .values({
            userId: user.id,
            provider,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            username: response.username,
            oauthId: response.user_id,
          })
          .returning({ id: oauthProviders.id });
        if (!createdProvider) throw new Error('OAuth provider insert did not return a row');

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
      const [updated] = await db
        .update(oauthProviders)
        .set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          username: response.username,
          oauthId: response.user_id,
        })
        .where(eq(oauthProviders.id, userOauth.id))
        .returning({ id: oauthProviders.id });
      if (!updated) throw new Error(`OAuth provider ${userOauth.id} no longer exists`);

      await saveSession(session, user, false);

      logger.info('updated oauth account', {
        provider,
        user: user.id,
      });

      return reply.redirect('/dashboard');
    } else if (existingOauth) {
      const loginUser = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(oauthProviders)
          .set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            username: response.username,
            oauthId: response.user_id,
          })
          .where(eq(oauthProviders.id, existingOauth.id))
          .returning({ id: oauthProviders.id });
        if (!updated) throw new Error(`OAuth provider ${existingOauth.id} no longer exists`);

        return getUser(existingOauth.userId, tx);
      });
      if (!loginUser) throw new ApiError(2001);

      if (session?.sessionId) session.destroy();

      await saveSession(session, loginUser, false);

      logger.info('logged in with oauth', {
        provider,
        user: loginUser.id,
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
      const nuser = await db.transaction(async (tx) => {
        const created = await createUser(
          {
            username: response.username!,
            token: createToken(),
            avatar: response.avatar ?? null,
          },
          tx,
        );
        const [createdProvider] = await tx
          .insert(oauthProviders)
          .values({
            userId: created.id,
            provider,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            username: response.username,
            oauthId: response.user_id,
          })
          .returning({ id: oauthProviders.id });
        if (!createdProvider) throw new Error('OAuth provider insert did not return a row');
        return created;
      });

      await saveSession(session, nuser, false);

      logger.info('created user with oauth', {
        provider,
        user: nuser.id,
      });

      return reply.redirect('/dashboard');
    } catch (e) {
      if (isPostgresError(e, '23505')) {
        // The unique constraint closes the race between the provider lookup and account creation.
        logger.warn('user tried to create account with oauth, but already linked', {
          oauth: response.username || 'unknown',
          ua: this.headers['user-agent'],
        });
        logger.debug('oauth create error', {
          error: e,
          response: safeOAuthResponse(response),
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
