import config from 'lib/config';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const pageCount = 16;

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const { page, filter, type, favorite } = req.query as {
    page: string;
    filter: string;
    type: string;
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

  if (type === 'count') {
    const count = await prisma.image.count({
      where,
    });

    const pages = Math.ceil(count / pageCount);

    return res.json({ count: pages });
  }

  if (!page) return res.badRequest('no page');
  if (isNaN(Number(page))) return res.badRequest('page is not a number');

  let files: {
    favorite: boolean;
    created_at: Date;
    id: number;
    file: string;
    mimetype: string;
    expires_at: Date;
    maxViews: number;
    views: number;
  }[] = await prisma.image.findMany({
    where,
    orderBy: {
      created_at: 'desc',
    },
    select: {
      created_at: true,
      expires_at: true,
      file: true,
      mimetype: true,
      id: true,
      favorite: true,
      views: true,
      maxViews: true,
    },
    skip: page ? (Number(page) - 1) * pageCount : undefined,
    take: page ? pageCount : undefined,
  });

  for (let i = 0; i !== files.length; ++i) {
    (files[i] as unknown as { url: string }).url = `${
      config.uploader.route === '/' ? '' : `${config.uploader.route}/`
    }${files[i].file}`;
  }

  return res.json(files);
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
