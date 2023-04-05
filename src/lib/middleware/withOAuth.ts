import { OauthProviders } from '@prisma/client';
import config from 'lib/config';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { createToken } from 'lib/util';
import { NextApiReq, NextApiRes } from './withZipline';

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
  avatar?: string;

  error?: string;
  error_code?: number;
  redirect?: string;
}

export const withOAuth =
  (
    provider: 'discord' | 'github' | 'google',
    oauth: (query: OAuthQuery, logger: Logger) => Promise<OAuthResponse>
  ) =>
  async (req: NextApiReq, res: NextApiRes) => {
    const logger = Logger.get(`oauth::${provider}`);

    function oauthError(error: string) {
      if (config.features.headless)
        return res.badRequest(error, {
          provider,
        });

      return res.redirect(`/oauth_error?error=${error}&provider=${provider}`);
    }

    req.query.host = req.headers.host;

    const oauth_resp = await oauth(req.query as unknown as OAuthQuery, logger);

    if (oauth_resp.error) {
      logger.debug(`Failed to authenticate with ${provider}: ${JSON.stringify(oauth_resp)})`);

      return oauthError(oauth_resp.error);
    }

    if (oauth_resp.redirect) {
      return res.redirect(oauth_resp.redirect);
    }

    const { state } = req.query as { state?: string };

    let existingOauth;
    try {
      existingOauth = await prisma.oAuth.findUniqueOrThrow({
        where: {
          provider_oauthId: {
            provider: provider.toUpperCase() as OauthProviders,
            oauthId: oauth_resp.user_id as string,
          },
        },
      });
    } catch (e) {
      logger.debug(`Failed to find existing oauth. Using fallback. ${e}`);
      if (e.code === 'P2022' || e.code === 'P2025') {
        const existing = await prisma.user.findFirst({
          where: {
            oauth: {
              some: {
                provider: provider.toUpperCase() as OauthProviders,
                username: oauth_resp.username,
              },
            },
          },
          include: {
            oauth: true,
          },
        });
        existingOauth = existing?.oauth?.find((o) => o.provider === provider.toUpperCase());
        if (existingOauth) existingOauth.fallback = true;
      } else {
        logger.error(`Failed to find existing oauth. ${e}`);
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        username: oauth_resp.username,
      },
      select: {
        username: true,
        id: true,
      },
    });

    const user = await req.user();

    const userOauth = user?.oauth?.find((o) => o.provider === provider.toUpperCase());

    if (state === 'link') {
      if (!user) return oauthError('You are not logged in, unable to link account.');

      if (user.oauth && user.oauth.find((o) => o.provider === provider.toUpperCase()))
        return oauthError(`This account was already linked with ${provider}!`);

      logger.debug(`attempting to link ${provider} account to ${user.username}`);
      try {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            oauth: {
              create: {
                provider: OauthProviders[provider.toUpperCase()],
                token: oauth_resp.access_token,
                refresh: oauth_resp.refresh_token || null,
                username: oauth_resp.username,
                oauthId: oauth_resp.user_id as string,
              },
            },
            avatar: oauth_resp.avatar,
          },
        });
      } catch (e) {
        if (e.code === 'P2002') {
          logger.debug(`account already linked with ${provider}`);
          return oauthError('This account is already linked with another user.');
        } else throw e;
      }

      res.setUserCookie(user.uuid);
      logger.info(`User ${user.username} (${user.id}) linked account via oauth(${provider})`);

      return res.redirect('/');
    } else if (user && userOauth) {
      logger.debug(`attempting to refresh ${provider} account for ${user.username}`);
      await prisma.oAuth.update({
        where: {
          id: userOauth?.id,
        },
        data: {
          token: oauth_resp.access_token,
          refresh: oauth_resp.refresh_token || null,
          username: oauth_resp.username,
          oauthId: oauth_resp.user_id as string,
        },
      });

      res.setUserCookie(user.uuid);
      logger.info(`User ${user.username} (${user.id}) logged in via oauth(${provider})`);

      return res.redirect('/dashboard');
    } else if ((existingOauth && existingOauth.fallback) || existingOauth) {
      await prisma.oAuth.update({
        where: {
          id: existingOauth?.id,
        },
        data: {
          token: oauth_resp.access_token,
          refresh: oauth_resp.refresh_token || null,
          username: oauth_resp.username,
          oauthId: oauth_resp.user_id as string,
        },
      });

      res.setUserCookie(existingOauth.userId);
      Logger.get('user').info(
        `User ${existingOauth.username} (${existingOauth.id}) logged in via oauth(${provider})`
      );

      return res.redirect('/dashboard');
    } else if (config.features.oauth_login_only) {
      return oauthError('Login only mode is enabled, unable to create account.');
    } else if (existingUser)
      return oauthError(`Username ${oauth_resp.username} is already taken, unable to create account.`);

    logger.debug('creating new user via oauth');
    try {
      const nuser = await prisma.user.create({
        data: {
          username: oauth_resp.username,
          token: createToken(),
          oauth: {
            create: {
              provider: OauthProviders[provider.toUpperCase()],
              token: oauth_resp.access_token,
              refresh: oauth_resp.refresh_token || null,
              username: oauth_resp.username,
              oauthId: oauth_resp.user_id as string,
            },
          },
          avatar: oauth_resp.avatar,
        },
      });

      logger.debug(`created user ${JSON.stringify(nuser)} via oauth(${provider})`);
      logger.info(`Created user ${nuser.username} via oauth(${provider})`);

      res.setUserCookie(nuser.uuid);
      logger.info(`User ${nuser.username} (${nuser.id}) logged in via oauth(${provider})`);

      return res.redirect('/dashboard');
    } catch (e) {
      if (e.code === 'P2002') {
        logger.debug(`account already linked with ${provider}`);
        return oauthError('This account is already linked with another user.');
      } else throw e;
    }
  };
