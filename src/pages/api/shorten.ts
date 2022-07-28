import prisma from 'lib/prisma';
import zconfig from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createInvisURL, randomChars } from 'lib/util';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (req.method !== 'POST') return res.forbid('no allow');
  if (!req.headers.authorization) return res.forbid('no authorization');
  
  const user = await prisma.user.findFirst({
    where: {
      token: req.headers.authorization,
    },
  });

  if (!user) return res.forbid('authorization incorect');
  if (!req.body) return res.error('no body');
  if (!req.body.url) return res.error('no url');
  const rand = randomChars(zconfig.urls.length);

  let invis;

  if (req.body.vanity) {
    const existing = await prisma.url.findFirst({
      where: {
        vanity: req.body.vanity,
      },
    });

    if (existing) return res.error('vanity already exists');
  }

  const url = await prisma.url.create({
    data: {
      id: rand,
      vanity: req.body.vanity ?? null,
      destination: req.body.url,
      userId: user.id,
    },
  });
    
  if (req.headers.zws) invis = await createInvisURL(zconfig.urls.length, url.id);

  Logger.get('url').info(`User ${user.username} (${user.id}) shortenned a url ${url.destination} (${url.id})`); 

  return res.json({ url: `${zconfig.core.https ? 'https' : 'http'}://${req.headers.host}${zconfig.urls.route}/${req.body.vanity ? req.body.vanity : invis ? invis.invis : url.id}` });
}

export default withZipline(handler);