import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (req.method === 'DELETE') {
    const fileIds = req.body.id as number[];

    const existingFiles = await prisma.incompleteFile.findMany({
      where: {
        id: {
          in: fileIds,
        },
        userId: user.id,
      },
    });

    const incFiles = await prisma.incompleteFile.deleteMany({
      where: {
        id: {
          in: existingFiles.map((x) => x.id),
        },
      },
    });

    return res.json(incFiles);
  } else {
    const files = await prisma.incompleteFile.findMany({
      where: {
        userId: user.id,
      },
    });

    return res.json(files);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE'],
  user: true,
});
