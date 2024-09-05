import { NextApiReq, NextApiRes } from '@/lib/response';
import { OAuthProviderType } from '@prisma/client';
import { prisma } from '../db';
import { findProvider } from './providerUtil';
import { createToken } from '../crypto';
import { config } from '../config';
import { User } from '../db/models/user';
import Logger, { log } from '../logger';
import { getSession, saveSession } from '@/server/session';

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

export const withOAuth =
  (
    provider: OAuthProviderType,
    oauthProfile: (query: OAuthQuery, logger: Logger) => Promise<OAuthResponse>,
  ) =>
  async (req: NextApiReq, res: NextApiRes) => {
    const logger = log('api').c('auth').c('oauth').c(provider.toLowerCase());

    req.query.host = req.headers.host ?? 'localhost:3000';

    const response = await oauthProfile(req.query as OAuthQuery, logger);

    const session = await getSession(req, res);

    if (response.error) {
      return res.serverError(response.error, {
        oauth: response.error_code,
      });
    }

    if (response.redirect) {
      return res.redirect(response.redirect);
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

    const { state } = req.query as OAuthQuery;

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

    if (state === 'link') {
      if (!user) return res.unauthorized('invalid session');

      if (findProvider(provider, user.oauthProviders))
        return res.badRequest('This account is already linked to this provider');

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

        await saveSession(session, <User>user);

        logger.info('linked oauth account', {
          provider,
          user: user.id,
        });

        return res.redirect('/dashboard/settings');
      } catch (e) {
        logger.error('failed to link oauth account', {
          provider,
          user: user.id,
          error: e,
        });

        return res.badRequest('Cant link account, already linked with this provider');
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

      await saveSession(session, <User>user);

      return res.redirect('/dashboard');
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

      await saveSession(session, <User>login.user!);

      logger.info('logged in with oauth', {
        provider,
        user: login.user!.id,
      });

      return res.redirect('/dashboard');
    } else if (config.oauth.loginOnly) {
      return res.badRequest("Can't create users through oauth.");
    } else if (existingUser) {
      return res.badRequest('This username is already taken');
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

      return res.redirect('/dashboard');
    } catch (e) {
      if ((e as { code: string }).code === 'P2002') {
        // already linked can't create, last failsafe lol
        return res.badRequest('Cant create user, already linked with this provider');
      } else throw e;
    }
  };
