import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createToken, getBase64URLFromURL, notNull } from 'lib/util';
import Logger from 'lib/logger';
import config from 'lib/config';
import { github_auth } from 'lib/oauth';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!config.features.oauth_registration) return res.forbid('oauth registration disabled');

  if (!notNull(config.oauth.github_client_id, config.oauth.github_client_secret)) {
    Logger.get('oauth').error('GitHub OAuth is not configured');
    return res.bad('GitHub OAuth is not configured');
  }

  const { code, state } = req.query as { code: string; state: string };

  if (!code) return res.redirect(github_auth.oauth_url(config.oauth.github_client_id, state));

  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.oauth.github_client_id,
      client_secret: config.oauth.github_client_secret,
      code,
    }),
  });

  if (!resp.ok) return res.error('invalid request');

  const json = await resp.json();

  if (!json.access_token) return res.error('no access_token in response');

  const userJson = await github_auth.oauth_user(json.access_token);
  if (!userJson) return res.error('invalid user request');

  const avatarBase64 = await getBase64URLFromURL(userJson.avatar_url);

  const existing = await prisma.user.findFirst({
    where: {
      username: userJson.login,
    },
  });

  if (state && state === 'link') {
    const user = await req.user();
    if (!user) return res.error('not logged in, unable to link account');

    if (user.oauth && user.oauthProvider === 'github') return res.error('account already linked with github');

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        oauth: true,
        oauthProvider: 'github',
        oauthAccessToken: json.access_token,
        avatar: avatarBase64,
      },
    });
    req.cleanCookie('user');
    res.setCookie('user', user.id, {
      sameSite: 'lax',
      expires: new Date(Date.now() + 6.048e8 * 2),
      path: '/',
    });
    Logger.get('user').info(`User ${user.username} (${user.id}) linked account via oauth(github)`);

    return res.redirect('/');
  } else if (existing && existing.oauth && existing.oauthProvider === 'github') {
    await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        oauthAccessToken: json.access_token,
      },
    });

    req.cleanCookie('user');
    res.setCookie('user', existing.id, {
      sameSite: 'lax',
      expires: new Date(Date.now() + 6.048e8 * 2),
      path: '/',
    });
    Logger.get('user').info(`User ${existing.username} (${existing.id}) logged in via oauth(github)`);

    return res.redirect('/dashboard');
  } else if (existing) {
    return res.forbid('username is already taken');
  }

  const user = await prisma.user.create({
    data: {
      username: userJson.login,
      token: createToken(),
      oauth: true,
      oauthProvider: 'github',
      oauthAccessToken: json.access_token,
      avatar: avatarBase64,
    },
  });
  Logger.get('user').info(`Created user ${user.username} via oauth(github)`);

  req.cleanCookie('user');
  res.setCookie('user', user.id, {
    sameSite: 'lax',
    expires: new Date(Date.now() + 6.048e8 * 2),
    path: '/',
  });
  Logger.get('user').info(`User ${user.username} (${user.id}) logged in via oauth(github)`);

  return res.redirect('/dashboard');
}

export default withZipline(handler);
