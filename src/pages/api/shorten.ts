import prisma from 'lib/prisma';
import zconfig from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createInvisURL, randomChars } from 'lib/util';
import Logger from 'lib/logger';
import config from 'lib/config';
import { sendShorten } from 'lib/discord';

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

  Logger.get('url').info(
    `User ${user.username} (${user.id}) shortenned a url ${url.destination} (${url.id})`
  );

  if (config.discord?.shorten) {
    await sendShorten(
      user,
      url,
      `${zconfig.core.https ? 'https' : 'http'}://${req.headers.host}${zconfig.urls.route}/${
        req.body.vanity ? req.body.vanity : invis ? invis.invis : url.id
      }`
    );
  }

  return res.json({
    url: `${zconfig.core.https ? 'https' : 'http'}://${req.headers.host}${zconfig.urls.route}/${
      req.body.vanity ? req.body.vanity : invis ? invis.invis : url.id
    }`,
  });
}

export default withZipline(handler, {
  methods: ['POST'],
});
