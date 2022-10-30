import prisma from 'lib/prisma';
import { hashPassword } from 'lib/util';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import Logger from 'lib/logger';
import config from 'lib/config';
import { discord_auth, github_auth } from 'lib/oauth';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  const userOauths = await prisma.oauth.findMany({
    where: {
      userId: user?.id,
    },
  });

  if (userOauths) {
    // this will probably change before the stable release
    if (userOauths.find((o) => o.provider === 'GITHUB')) {
      const resp = await github_auth.oauth_user(userOauths.find((o) => o.provider === 'GITHUB').token);
      if (!resp) {
        req.cleanCookie('user');
        Logger.get('user').info(`User ${user.username} (${user.id}) logged out (oauth token expired)`);

        return res.json({
          error: 'oauth token expired',
          redirect_uri: github_auth.oauth_url(config.oauth.github_client_id),
        });
      }
    } else if (userOauths.find((o) => o.provider === 'DISCORD')) {
      const resp = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${userOauths.find((o) => o.provider === 'DISCORD').token}`,
        },
      });
      if (!resp.ok) {
        req.cleanCookie('user');
        Logger.get('user').info(`User ${user.username} (${user.id}) logged out (oauth token expired)`);

        return res.json({
          error: 'oauth token expired',
          redirect_uri: discord_auth.oauth_url(
            config.oauth.discord_client_id,
            `${config.core.https ? 'https' : 'http'}://${req.headers.host}`
          ),
        });
      }
    }
  }

  if (req.method === 'PATCH') {
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
      if (existing && user.username !== req.body.username) {
        return res.forbid('username is already taken');
      }
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

    if (req.body.embedTitle)
      await prisma.user.update({
        where: { id: user.id },
        data: { embedTitle: req.body.embedTitle },
      });

    if (req.body.embedColor)
      await prisma.user.update({
        where: { id: user.id },
        data: { embedColor: req.body.embedColor },
      });

    if (req.body.embedSiteName)
      await prisma.user.update({
        where: { id: user.id },
        data: { embedSiteName: req.body.embedSiteName },
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

      if (invalidDomains.length) return res.forbid('invalid domains', { invalidDomains });

      await prisma.user.update({
        where: { id: user.id },
        data: { domains },
      });

      return res.json({ domains });
    }

    const newUser = await prisma.user.findFirst({
      where: {
        id: Number(user.id),
      },
      select: {
        administrator: true,
        embedColor: true,
        embedTitle: true,
        embedSiteName: true,
        id: true,
        images: false,
        password: false,
        systemTheme: true,
        token: true,
        username: true,
        domains: true,
        avatar: true,
        oauth: true,
      },
    });

    Logger.get('user').info(`User ${user.username} (${newUser.username}) (${newUser.id}) was updated`);

    return res.json(newUser.oauth);
  } else {
    delete user.password;

    return res.json(user);
  }
}

export default withZipline(handler);
