import { prisma } from '@/lib/db';
import { Tag, tagSelect } from '@/lib/db/models/tag';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserTagsResponse = Tag | Tag[];

type Body = {
  name: string;
  color: string;
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserTagsResponse>) {
  if (req.method === 'POST') {
    const { name, color } = req.body;

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        userId: req.user.id,
      },
      select: tagSelect,
    });

    return res.ok(tag);
  }

  const tags = await prisma.tag.findMany({
    where: {
      userId: req.user.id,
    },
    select: tagSelect,
  });

  return res.ok(tags);
}

export default combine([method(['GET', 'POST']), ziplineAuth()], handler);
