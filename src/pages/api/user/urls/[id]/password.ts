import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserUrlsIdPasswordResponse = {
  success: boolean;
};

type Body = {
  password: string;
};

const logger = log('api').c('user').c('urls').c('$id').c('password');

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserUrlsIdPasswordResponse>) {
  const url = await prisma.url.findFirst({
    where: {
      OR: [{ id: req.query.id }, { code: req.query.id }, { vanity: req.query.id }],
    },
    select: {
      password: true,
      id: true,
    },
  });
  if (!url) return res.notFound();
  if (!url.password) return res.notFound();

  const verified = await verifyPassword(req.body.password, url.password);
  if (!verified) return res.forbidden('Incorrect password');

  logger.info(`url ${url.id} was accessed with the correct password`, { ua: req.headers['user-agent'] });

  return res.ok({ success: true });
}

export default combine([method(['POST'])], handler);
