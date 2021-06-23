import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');
  
  const take = Number(req.query.take ?? 3);

  if (take > 50) return res.error('take can\'t be more than 50');

  const images = await prisma.image.findMany({
    take,
    orderBy: {
      created_at: 'desc'
    },
    select: {
      created_at: true,
      file: true,
      mimetype: true
    }
  });

  return res.json(images);
}

export default withZipline(handler);