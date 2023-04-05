import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  let { id } = req.query as { id: string | number };

  if (!id) return res.badRequest('no id');

  id = Number(id);

  if (isNaN(id)) return res.badRequest('invalid id');

  const file = await prisma.file.findFirst({
    where: { id, userId: user.id },
    select: {
      tags: true,
    },
  });

  if (!file) return res.notFound('file not found or not owned by user');

  if (req.method === 'DELETE') {
    const { tags } = req.body as {
      tags: string[];
    };

    if (!tags) return res.badRequest('no tags');
    if (!tags.length) return res.badRequest('no tags');

    const nFile = await prisma.file.update({
      where: { id },
      data: {
        tags: {
          disconnect: tags.map((tag) => ({ id: tag })),
        },
      },
      select: {
        tags: true,
      },
    });

    return res.json(nFile.tags);
  } else if (req.method === 'PATCH') {
    const { tags } = req.body as {
      tags: string[];
    };

    if (!tags) return res.badRequest('no tags');
    if (!tags.length) return res.badRequest('no tags');

    const nFile = await prisma.file.update({
      where: { id },
      data: {
        tags: {
          connect: tags.map((tag) => ({ id: tag })),
        },
      },
      select: {
        tags: true,
      },
    });

    return res.json(nFile.tags);
  } else if (req.method === 'POST') {
    const { tags } = req.body as {
      tags: {
        name?: string;
        color?: string;
        id?: string;
      }[];
    };

    if (!tags) return res.badRequest('no tags');
    if (!tags.length) return res.badRequest('no tags');

    // if the tag has an id, it means it already exists so we just connect it
    // if it doesn't have an id, we create it and then connect it
    const nFile = await prisma.file.update({
      where: { id },
      data: {
        tags: {
          connectOrCreate: tags.map((tag) => ({
            where: { id: tag.id ?? '' },
            create: {
              name: tag.name,
              color: tag.color,
            },
          })),
        },
      },
      select: {
        tags: true,
      },
    });

    return res.json(nFile.tags);
  }

  return res.json(file.tags);
}

export default withZipline(handler, {
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  user: true,
});
