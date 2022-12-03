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

    const user = await req.user();

    const existingOauth = existing?.oauth?.find((o) => o.provider === provider.toUpperCase());
    const userOauth = user?.oauth?.find((o) => o.provider === provider.toUpperCase());

    if (state === 'link') {
      if (!user) return oauthError('You are not logged in, unable to link account.');

      if (user.oauth && user.oauth.find((o) => o.provider === provider.toUpperCase()))
        return oauthError(`This account was already linked with ${provider}!`);

      logger.debug(`attempting to link ${provider} account to ${user.username}`);
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
            },
          },
          avatar: oauth_resp.avatar,
        },
      });

      res.setUserCookie(user.id);
      logger.info(`User ${user.username} (${user.id}) linked account via oauth(${provider})`);

      return res.redirect('/');
    } else if (user && userOauth) {
      logger.debug(`attempting to refresh ${provider} account for ${user.username}`);
      await prisma.oAuth.update({
        where: {
          id: userOauth!.id,
        },
        data: {
          token: oauth_resp.access_token,
          refresh: oauth_resp.refresh_token || null,
          username: oauth_resp.username,
        },
      });

      res.setUserCookie(user.id);
      logger.info(`User ${user.username} (${user.id}) logged in via oauth(${provider})`);

      return res.redirect('/dashboard');
    } else if (existing && existingOauth) {
      await prisma.oAuth.update({
        where: {
          id: existingOauth!.id,
        },
        data: {
          token: oauth_resp.access_token,
          refresh: oauth_resp.refresh_token || null,
          username: oauth_resp.username,
        },
      });

      res.setUserCookie(existing.id);
      Logger.get('user').info(`User ${existing.username} (${existing.id}) logged in via oauth(${provider})`);

      return res.redirect('/dashboard');
    } else if (existing) {
      return oauthError(`Username "${oauth_resp.username}" is already taken, unable to create account.`);
    }

    logger.debug('creating new user via oauth');
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
          },
        },
        avatar: oauth_resp.avatar,
      },
    });

    logger.debug(`created user ${JSON.stringify(nuser)} via oauth(${provider})`);
    logger.info(`Created user ${nuser.username} via oauth(${provider})`);

    res.setUserCookie(nuser.id);
    logger.info(`User ${nuser.username} (${nuser.id}) logged in via oauth(${provider})`);

    return res.redirect('/dashboard');
  };
