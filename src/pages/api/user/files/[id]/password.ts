import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

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
      name: true,
      password: true,
    },
  });
  if (!file) return res.notFound();
  if (!file.password) return res.notFound();

  const verified = await verifyPassword(req.body.password, file.password);
  if (!verified) return res.forbidden('Incorrect password');

  logger.info(`${file.name} was accessed with the correct password`, { ua: req.headers['user-agent'] });

  return res.ok({ success: true });
}

export default combine([method(['POST'])], handler);
