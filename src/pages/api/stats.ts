import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  const stats = await prisma.stats.findFirst({
    orderBy: {
      created_at: 'desc',
    },
    take: 1,
  });

  return res.json(stats.data);
}

export default withZipline(handler);