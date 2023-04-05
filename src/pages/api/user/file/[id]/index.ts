import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import { pick } from 'utils/db';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  let { id } = req.query as { id: string | number };

  if (!id) return res.badRequest('no id');

  id = Number(id);

  if (isNaN(id)) return res.badRequest('invalid id');

  const file = await prisma.file.findFirst({
    where: { id, userId: user.id },
    include: {
      tags: true,
      invisible: true,
      folder: true,
    },
  });

  if (!file) return res.notFound('file not found or not owned by user');

  if (req.method === 'DELETE') {
    return res.badRequest('file deletions must be done at `DELETE /api/user/files`');
  } else {
    // @ts-ignore
    if (file.password) file.password = true;

    if (req.query.pick) {
      const picks = (req.query.pick as string).split(',') as (keyof typeof file)[];

      return res.json(pick(file, picks));
    }

    return res.json(file);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE'],
  user: true,
});
