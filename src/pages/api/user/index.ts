import config from 'lib/config';
import Logger from 'lib/logger';
import { discord_auth, github_auth, google_auth } from 'lib/oauth';
import prisma from 'lib/prisma';
import { hashPassword } from 'lib/util';
import { jsonUserReplacer } from 'lib/utils/client';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('user');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (user.oauth) {
    // this will probably change before the stable release
    if (user.oauth.find((o) => o.provider === 'GITHUB')) {
      const resp = await github_auth.oauth_user(user.oauth.find((o) => o.provider === 'GITHUB').token);
      if (!resp) {
        logger.debug(`oauth expired for ${JSON.stringify(user, jsonUserReplacer)}`);

        return res.json({
          error: 'oauth token expired',
          redirect_uri: github_auth.oauth_url(config.oauth.github_client_id),
        });
      }
    } else if (user.oauth.find((o) => o.provider === 'DISCORD')) {
      const resp = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${user.oauth.find((o) => o.provider === 'DISCORD').token}`,
        },
      });
      if (!resp.ok) {
        const provider = user.oauth.find((o) => o.provider === 'DISCORD');
        if (!provider.refresh) {
          logger.debug(`couldn't find a refresh token for ${JSON.stringify(user, jsonUserReplacer)}`);

          return res.json({
            error: 'oauth token expired',
            redirect_uri: discord_auth.oauth_url(
              config.oauth.discord_client_id,
              `${config.core.return_https ? 'https' : 'http'}://${req.headers.host}`
            ),
          });
        }

        const resp2 = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: config.oauth.discord_client_id,
            client_secret: config.oauth.discord_client_secret,
            grant_type: 'refresh_token',
            refresh_token: provider.refresh,
          }),
        });
        if (!resp2.ok) {
          logger.debug(`oauth expired for ${JSON.stringify(user, jsonUserReplacer)}`);

          return res.json({
            error: 'oauth token expired',
            redirect_uri: discord_auth.oauth_url(
              config.oauth.discord_client_id,
              `${config.core.return_https ? 'https' : 'http'}://${req.headers.host}`
            ),
          });
        }
        const json = await resp2.json();

        await prisma.oAuth.update({
          where: {
            id: provider.id,
          },
          data: {
            token: json.access_token,
            refresh: json.refresh_token,
          },
        });
      }
    } else if (user.oauth.find((o) => o.provider === 'GOOGLE')) {
      const resp = await fetch(
        `https://people.googleapis.com/v1/people/me?access_token=${
          user.oauth.find((o) => o.provider === 'GOOGLE').token
        }&personFields=names,photos`
      );
      if (!resp.ok) {
        const provider = user.oauth.find((o) => o.provider === 'GOOGLE');
        if (!provider.refresh) {
          logger.debug(`couldn't find a refresh token for ${JSON.stringify(user, jsonUserReplacer)}`);

          return res.json({
            error: 'oauth token expired',
            redirect_uri: google_auth.oauth_url(
              config.oauth.google_client_id,
              `${config.core.return_https ? 'https' : 'http'}://${req.headers.host}`
            ),
          });
        }
        const resp2 = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: config.oauth.google_client_id,
            client_secret: config.oauth.google_client_secret,
            grant_type: 'refresh_token',
            refresh_token: provider.refresh,
          }),
        });
        if (!resp2.ok) {
          logger.debug(`oauth expired for ${JSON.stringify(user, jsonUserReplacer)}`);

          return res.json({
            error: 'oauth token expired',
            redirect_uri: google_auth.oauth_url(
              config.oauth.google_client_id,
              `${config.core.return_https ? 'https' : 'http'}://${req.headers.host}`
            ),
          });
        }

        const json = await resp2.json();

        await prisma.oAuth.update({
          where: {
            id: provider.id,
          },
          data: {
            token: json.access_token,
            refresh: json.refresh_token,
          },
        });
      }
    }
  }

  if (req.method === 'PATCH') {
    logger.debug(`attempting to update user ${JSON.stringify(user, jsonUserReplacer)}`);

    if (req.body.password) {
      const hashed = await hashPassword(req.body.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
    }

    if (req.body.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: req.body.username,
        },
      });
      if (existing && user.username !== req.body.username) return res.badRequest('username is already taken');

      await prisma.user.update({
        where: { id: user.id },
        data: { username: req.body.username },
      });
    }

    if (req.body.avatar)
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: req.body.avatar },
      });

    if (req.body.resetAvatar)
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: null },
      });

    if (req.body.embed)
      await prisma.user.update({
        where: { id: user.id },
        data: { embed: req.body.embed },
      });

    if (req.body.systemTheme)
      await prisma.user.update({
        where: { id: user.id },
        data: { systemTheme: req.body.systemTheme },
      });

    if (req.body.domains) {
      if (!req.body.domains)
        await prisma.user.update({
          where: { id: user.id },
          data: { domains: [] },
        });

      const invalidDomains = [];
      const domains = [];

      for (const domain of req.body.domains) {
        try {
          const url = new URL(domain);
          domains.push(url.origin);
        } catch (e) {
          invalidDomains.push({ domain, reason: e.message });
        }
      }

      if (invalidDomains.length) return res.badRequest('invalid domains', { invalidDomains });

      await prisma.user.update({
        where: { id: user.id },
        data: { domains },
      });
    }

    const newUser = await prisma.user.findFirst({
      where: {
        id: Number(user.id),
      },
      select: {
        administrator: true,
        embed: true,
        id: true,
        files: false,
        password: false,
        systemTheme: true,
        token: true,
        username: true,
        domains: true,
        avatar: true,
        oauth: true,
      },
    });

    logger.debug(`updated user ${JSON.stringify(newUser, jsonUserReplacer)}`);

    logger.info(`User ${user.username} (${newUser.username}) (${newUser.id}) was updated`);

    return res.json(newUser);
  } else {
    delete user.password;

    return res.json(user);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'PATCH'],
  user: true,
});
