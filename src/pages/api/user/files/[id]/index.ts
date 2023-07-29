import { bytes } from '@/lib/bytes';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { File, fileSelect } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserFilesIdResponse = File;

type Body = {
  favorite?: boolean;
};

type Query = {
  id: string;
};

const logger = log('api').c('user').c('files').c('[id]');

export async function handler(req: NextApiReq<Body, Query>, res: NextApiRes<ApiUserFilesIdResponse>) {
  const file = await prisma.file.findFirst({
    where: {
      OR: [{ id: req.query.id }, { name: req.query.id }],
    },
    select: fileSelect,
  });
  if (!file) return res.notFound();

  if (req.method === 'PATCH') {
    const newFile = await prisma.file.update({
      where: {
        id: req.query.id,
      },
      data: {
        ...(req.body.favorite !== undefined && { favorite: req.body.favorite }),
      },
      select: fileSelect,
    });

    logger.info(`${req.user.username} updated file ${newFile.name}`, { favorite: newFile.favorite });

    return res.ok(newFile);
  } else if (req.method === 'DELETE') {
    const deletedFile = await prisma.file.delete({
      where: {
        id: req.query.id,
      },
      select: fileSelect,
    });

    await datasource.delete(deletedFile.name);

    logger.info(`${req.user.username} deleted file ${deletedFile.name}`, { size: bytes(deletedFile.size) });

    return res.ok(deletedFile);
  }

  return res.ok(file);
}

export default combine([method(['GET', 'PATCH', 'DELETE']), ziplineAuth()], handler);
