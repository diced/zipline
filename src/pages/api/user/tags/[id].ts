import { prisma } from '@/lib/db';
import { Tag, tagSelect } from '@/lib/db/models/tag';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserTagsIdResponse = Tag;

type Body = {
  name?: string;
  color?: string;
};

type Query = {
  id: string;
};

export async function handler(req: NextApiReq<Body, Query>, res: NextApiRes<ApiUserTagsIdResponse>) {
  const { id } = req.query;

  const tag = await prisma.tag.findFirst({
    where: {
      userId: req.user.id,
      id,
    },
    select: tagSelect,
  });
  if (!tag) return res.notFound();

  if (req.method === 'DELETE') {
    const tag = await prisma.tag.delete({
      where: {
        id,
      },
      select: tagSelect,
    });

    return res.ok(tag);
  }

  if (req.method === 'PATCH') {
    const { name, color } = req.body;

    if (name) {
      const existing = await prisma.tag.findFirst({
        where: {
          name,
        },
      });

      if (existing) return res.badRequest('tag name already exists');
    }

    const tag = await prisma.tag.update({
      where: {
        id,
      },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
      select: tagSelect,
    });

    return res.ok(tag);
  }

  return res.ok(tag);
}

export default combine([method(['GET', 'DELETE', 'PATCH']), ziplineAuth()], handler);
