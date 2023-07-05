import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { File, fileSelect } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import bytes from 'bytes';

export type ApiUserFilesIdPasswordResponse = {
  success: boolean;
};

type Body = {
  password: string;
};

const logger = log('api').c('user').c('files').c('$id').c('password');

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserFilesIdPasswordResponse>) {
  const file = await prisma.file.findFirst({
    where: {
      OR: [{ id: req.query.id }, { name: req.query.id }],
    },
    select: {
      password: true,
    },
  });
  if (!file) return res.notFound();
  if (!file.password) return res.forbidden("This file doesn't have a password");

  const verified = await verifyPassword(req.body.password, file.password);
  if (!verified) return res.forbidden('Incorrect password');

  return res.ok({ success: true });
}

export default combine([method(['POST'])], handler);
