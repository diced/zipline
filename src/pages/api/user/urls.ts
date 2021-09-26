import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import config from 'lib/config';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  if (req.method === 'DELETE') {
    if (!req.body.id) return res.error('no url id');

    const url = await prisma.url.delete({
      where: {
        id: req.body.id,
      },
    });

    Logger.get('url').info(`User ${user.username} (${user.id}) deleted a url ${url.destination} (${url.id})`);

    return res.json(url);
  } else {
    let urls = await prisma.url.findMany({
      where: {
        userId: user.id,
      },
      select: {
        created_at: true,
        id: true,
        destination: true,
        vanity: true,
      },
    });

    // @ts-ignore
    urls.map(url => url.url = `${config.urls.route}/${url.vanity ?? url.id}`);
    return res.json(urls);
  }
}

export default withZipline(handler);