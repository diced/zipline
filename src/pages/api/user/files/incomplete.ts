import { prisma } from '@/lib/db';
import { IncompleteFile } from '@/lib/db/models/incompleteFile';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserFilesIncompleteResponse = IncompleteFile[] | { count: number };

type Body = {
  id: string[];
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserFilesIncompleteResponse>) {
  if (req.method === 'DELETE') {
    if (!req.body.id) return res.badRequest('no id array provided');

    const existingFiles = await prisma.incompleteFile.findMany({
      where: {
        id: {
          in: req.body.id,
        },
        userId: req.user.id,
      },
    });

    const incompleteFiles = await prisma.incompleteFile.deleteMany({
      where: {
        id: {
          in: existingFiles.map((x) => x.id),
        },
      },
    });

    return res.json({ incompletefiles: incompleteFiles });
  }

  const incompleteFiles = await prisma.incompleteFile.findMany({
    where: {
      userId: req.user.id,
    },
  });

  return res.json(incompleteFiles);
}

export default combine([method(['GET', 'DELETE']), ziplineAuth()], handler);
