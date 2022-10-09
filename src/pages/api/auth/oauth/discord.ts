import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createToken, getBase64URLFromURL, notNull } from 'lib/util';
import Logger from 'lib/logger';
import config from 'lib/config';
import { discord_auth } from 'lib/oauth';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!config.features.oauth_registration) return res.forbid('oauth registration disabled');

  if (!notNull(config.oauth.discord_client_id, config.oauth.discord_client_secret)) {
    Logger.get('oauth').error('Discord OAuth is not configured');
    return res.bad('Discord OAuth is not configured');
  }

  const { code } = req.query as { code: string };
  if (!code) return res.bad('no code');

  const resp = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.oauth.discord_client_id,
      client_secret: config.oauth.discord_client_secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${config.core.https ? 'https' : 'http'}://${req.headers.host}/api/auth/oauth/discord`,
      scope: 'identify',
    }),
  });
  if (!resp.ok) return res.error('invalid request');
  const json = await resp.json();

  if (!json.access_token) return res.error('no access_token in response');

  const userJson = await discord_auth.oauth_user(json.access_token);
  if (!userJson) return res.error('invalid user request');

  const avatar = userJson.avatar ? `https://cdn.discordapp.com/avatars/${userJson.id}/${userJson.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${userJson.discriminator % 5}.png`;
  const avatarBase64 = await getBase64URLFromURL(avatar);

  const existing = await prisma.user.findFirst({
    where: {
      username: userJson.username,
    },
  });

  if (existing && existing.oauth && existing.oauthProvider === 'discord') {
    await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        oauthAccessToken: json.access_token,
      },
    });

    req.cleanCookie('user');
    res.setCookie('user', existing.id, { sameSite: true, expires: new Date(Date.now() + (6.048e+8 * 2)), path: '/' });
    Logger.get('user').info(`User ${existing.username} (${existing.id}) logged in via oauth(discord)`);

    return res.redirect('/dashboard');
  } else if (existing) {
    return res.forbid('username is already taken');
  }

  const user = await prisma.user.create({
    data: {
      username: userJson.username,
      token: createToken(),
      oauth: true,
      oauthProvider: 'discord',
      oauthAccessToken: json.access_token,
      avatar: avatarBase64,
    },
  });
  Logger.get('user').info(`Created user ${user.username} via oauth(discord)`);

  req.cleanCookie('user');
  res.setCookie('user', user.id, { sameSite: true, expires: new Date(Date.now() + (6.048e+8 * 2)), path: '/' });
  Logger.get('user').info(`User ${user.username} (${user.id}) logged in via oauth(discord)`);

  return res.redirect('/dashboard');
}

export default withZipline(handler);