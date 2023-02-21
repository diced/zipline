import { default as config, default as zconfig } from 'lib/config';
import { sendShorten } from 'lib/discord';
import Logger from 'lib/logger';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import prisma from 'lib/prisma';
import { createInvisURL, randomChars } from 'lib/util';

const logger = Logger.get('shorten');

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!req.headers.authorization) return res.badRequest('no authorization');

  const user = await prisma.user.findFirst({
    where: {
      token: req.headers.authorization,
    },
  });

  if (!user) return res.unauthorized('authorization incorect');
  if (!req.body) return res.badRequest('no body');
  if (!req.body.url) return res.badRequest('no url');

  if (req.body.vanity && req.body.vanity.trim().length === 0) return res.badRequest('vanity is empty');

  const maxUrlViews = req.headers['max-views'] ? Number(req.headers['max-views']) : null;
  if (isNaN(maxUrlViews)) return res.badRequest('invalid max views (invalid number)');
  if (maxUrlViews < 0) return res.badRequest('invalid max views (max views < 0)');

  const rand = randomChars(zconfig.urls.length);

  let invis;

  if (req.body.vanity) {
    const existing = await prisma.url.findFirst({
      where: {
        vanity: req.body.vanity,
      },
    });

    if (existing) return res.badRequest('vanity already exists');
  }

  const url = await prisma.url.create({
    data: {
      id: rand,
      vanity: req.body.vanity ?? null,
      destination: req.body.url,
      userId: user.id,
      maxViews: maxUrlViews,
    },
  });

  if (req.headers.zws) invis = await createInvisURL(zconfig.urls.length, url.id);

  logger.debug(`shortened ${JSON.stringify(url)}`);

  logger.info(`User ${user.username} (${user.id}) shortenned a url ${url.destination} (${url.id})`);

  let domain;
  if (req.headers['override-domain']) {
    domain = `${zconfig.core.return_https ? 'https' : 'http'}://${req.headers['override-domain']}`;
  } else if (user.domains.length) {
    const randomDomain = user.domains[Math.floor(Math.random() * user.domains.length)];
    domain = `${zconfig.core.return_https ? 'https' : 'http'}://${randomDomain}`;
  } else {
    domain = `${zconfig.core.return_https ? 'https' : 'http'}://${req.headers.host}`;
  }

  const responseUrl = `${domain}${zconfig.urls.route === '/' ? '/' : zconfig.urls.route + '/'}${
    req.body.vanity ? req.body.vanity : invis ? invis.invis : url.id
  }`;

  if (config.discord?.shorten) {
    await sendShorten(user, url, responseUrl);
  }

  if (req.headers['no-json']) {
    res.setHeader('Content-Type', 'text/plain');
    return res.end(responseUrl);
  }

  return res.json({
    url: responseUrl,
  });
}

export default withZipline(handler, {
  methods: ['POST'],
});
