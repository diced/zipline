import config from 'lib/config';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (req.method === 'DELETE') {
    if (!req.body.id) return res.badRequest('no url id');

    const url = await prisma.url.delete({
      where: {
        id: req.body.id,
      },
    });

    Logger.get('url').info(`User ${user.username} (${user.id}) deleted a url ${url.destination} (${url.id})`);

    return res.json(url);
  } else {
    const urls = await prisma.url.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
        id: true,
        destination: true,
        vanity: true,
        views: true,
        maxViews: true,
      },
    });

    for (let i = 0; i !== urls.length; ++i) {
      (urls[i] as unknown as { url: string }).url = formatRootUrl(
        config.urls.route,
        urls[i].vanity ?? urls[i].id,
      );
    }
    return res.json(urls);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE'],
  user: true,
});
