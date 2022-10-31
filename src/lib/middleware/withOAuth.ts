import { createToken } from 'lib/util';
import Logger from 'lib/logger';
import { NextApiReq, NextApiRes } from './withZipline';
import prisma from 'lib/prisma';
import { OauthProviders } from '@prisma/client';

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
  (provider: 'discord' | 'github' | 'google', oauth: (query: OAuthQuery) => Promise<OAuthResponse>) =>
  async (req: NextApiReq, res: NextApiRes) => {
    req.query.host = req.headers.host;

    const oauth_resp = await oauth(req.query as unknown as OAuthQuery);

    if (oauth_resp.error) {
      return res.json({ error: oauth_resp.error }, oauth_resp.error_code || 500);
    }

    if (oauth_resp.redirect) {
      return res.redirect(oauth_resp.redirect);
    }

    const { code, state } = req.query as { code: string; state?: string };

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
    const existingUserOauth = user?.oauth?.find((o) => o.provider === provider.toUpperCase());
    if (state === 'link') {
      if (!user) return res.error('not logged in, unable to link account');

      if (user.oauth && user.oauth.find((o) => o.provider === provider.toUpperCase()))
        return res.error(`account already linked with ${provider}`);

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
      Logger.get('user').info(`User ${user.username} (${user.id}) linked account via oauth(${provider})`);

      return res.redirect('/');
    } else if (user && existingUserOauth) {
      await prisma.oAuth.update({
        where: {
          id: existingUserOauth!.id,
        },
        data: {
          token: oauth_resp.access_token,
          refresh: oauth_resp.refresh_token || null,
          username: oauth_resp.username,
        },
      });

      res.setUserCookie(user.id);
      Logger.get('user').info(`User ${user.username} (${user.id}) logged in via oauth(${provider})`);

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
      return res.forbid('username is already taken');
    }

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
    Logger.get('user').info(`Created user ${nuser.username} via oauth(${provider})`);

    res.setUserCookie(nuser.id);
    Logger.get('user').info(`User ${nuser.username} (${nuser.id}) logged in via oauth(${provider})`);

    return res.redirect('/dashboard');
  };
