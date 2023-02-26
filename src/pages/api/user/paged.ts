import config from 'lib/config';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const pageCount = 16;

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const { page, filter, count, favorite } = req.query as {
    page: string;
    filter: string;
    count: string;
    favorite: string;
  };

  const where = {
    userId: user.id,
    favorite: !!favorite,

    ...(filter === 'media' && {
      OR: [
        {
          mimetype: { startsWith: 'image/' },
        },
        {
          mimetype: { startsWith: 'video/' },
        },
        {
          mimetype: { startsWith: 'audio/' },
        },
        {
          mimetype: { startsWith: 'text/' },
        },
      ],
    }),
  };

  if (count) {
    const count = await prisma.file.count({
      where,
    });

    const pages = Math.ceil(count / pageCount);

    return res.json({ count: pages });
  }

  if (!page) return res.badRequest('no page');
  if (isNaN(Number(page))) return res.badRequest('page is not a number');

  let files: {
    favorite: boolean;
    createdAt: Date;
    id: number;
    name: string;
    mimetype: string;
    expiresAt: Date;
    maxViews: number;
    views: number;
    folderId: number;
    size: number;
  }[] = await prisma.file.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      createdAt: true,
      expiresAt: true,
      name: true,
      mimetype: true,
      id: true,
      favorite: true,
      views: true,
      maxViews: true,
      folderId: true,
      size: true,
    },
    skip: page ? (Number(page) - 1) * pageCount : undefined,
    take: page ? pageCount : undefined,
  });

  for (let i = 0; i !== files.length; ++i) {
    (files[i] as unknown as { url: string }).url = formatRootUrl(config.uploader.route, files[i].name);
  }

  return res.json(files);
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
