import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import config from 'lib/config';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const take = Number(req.query.take ?? 4);

  if (take > 50) return res.badRequest("take can't be more than 50");

  let images = await prisma.image.findMany({
    take,
    where: {
      userId: user.id,
    },
    orderBy: {
      created_at: 'desc',
    },
    select: {
      created_at: true,
      expires_at: true,
      file: true,
      mimetype: true,
      id: true,
      views: true,
      maxViews: true,
    },
  });

  for (let i = 0; i !== images.length; ++i) {
    (images[i] as unknown as { url: string }).url = `${config.uploader.route}/${images[i].file}`;
  }

  if (req.query.filter && req.query.filter === 'media')
    images = images.filter((x) => /^(video|audio|image)/.test(x.mimetype));

  return res.json(images);
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
