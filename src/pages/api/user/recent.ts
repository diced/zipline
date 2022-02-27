import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');
  
  const take = Number(req.query.take ?? 4);

  if (take > 50) return res.error('take can\'t be more than 50');

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
      file: true,
      mimetype: true,
      id: true,
    },
  });

  // @ts-ignore
  images.map(image => image.url = `/r/${image.file}`);
  if (req.query.filter && req.query.filter === 'media') images = images.filter(x => /^(video|audio|image)/.test(x.mimetype));

  return res.json(images);
}

export default withZipline(handler);