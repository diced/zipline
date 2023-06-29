import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

type Data = {
  pass: boolean;
};

export async function handler(req: NextApiReq, res: NextApiRes<Data>) {
  const logger = log('api').c('healthcheck');

  try {
    await prisma.$queryRaw`SELECT 1;`;

    return res.ok({ pass: true });
  } catch (e) {
    logger.error('there was an error during a healthcheck').error(e);

    return res.serverError('there was an error during a healthcheck', {
      pass: false,
    });
  }
}

export default combine([cors(), method(['GET'])], handler);
