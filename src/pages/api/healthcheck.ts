import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiHealthcheckResponse = {
  pass: boolean;
};

export async function handler(req: NextApiReq, res: NextApiRes<ApiHealthcheckResponse>) {
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

export default combine([method(['GET'])], handler);
