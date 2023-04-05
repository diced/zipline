import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const tags = await prisma.tag.findMany({
    where: {
      files: {
        every: {
          userId: user.id,
        },
      },
    },
    include: {
      files: {
        select: {
          id: true,
        },
      },
    },
  });

  if (req.method === 'DELETE') {
    const { tags: tagIds } = req.body as {
      tags: string[];
    };

    if (!tagIds) return res.badRequest('no tags');
    if (!tagIds.length) return res.badRequest('no tags');

    const nTags = await prisma.tag.deleteMany({
      where: {
        id: {
          in: tagIds,
        },
      },
    });

    return res.json(nTags);
  } else if (req.method === 'POST') {
    const { tags } = req.body as {
      tags: {
        name: string;
        color: string;
      }[];
    };

    if (!tags) return res.badRequest('no tags');
    if (!tags.length) return res.badRequest('no tags');

    const nTags = await prisma.tag.createMany({
      data: tags.map((tag) => ({
        name: tag.name,
        color: tag.color,
      })),
    });

    return res.json(nTags);
  }

  return res.json(tags);
}

export default withZipline(handler, {
  methods: ['GET', 'POST', 'DELETE'],
  user: true,
});
