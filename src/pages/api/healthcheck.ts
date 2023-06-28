import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { badRequest, ok, ratelimited, serverError } from '@/lib/response';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';

type Data = {
  pass: boolean;
};

const ratelimit: Map<string, number> = new Map();

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const logger = log('api').c('healthcheck');

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
  if (!ip) {
    logger.debug(`request without an ip address blocked`);
    return badRequest(res, 'no ip address found');
  }

  const last = ratelimit.get(ip);

  if (last) {
    if (last && Date.now() - last < 10000) {
      logger.debug(`request from ${ip} blocked due to ratelimit`);
      return ratelimited(res, Math.ceil((last + 10000 - Date.now()) / 1000));
    } else {
      ratelimit.delete(ip);
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1;`;
    ratelimit.set(ip, Date.now());

    return ok(res, { pass: true });
  } catch (e) {
    logger.error('there was an error during a healthcheck').error(e);
    ratelimit.set(ip, Date.now());

    return serverError(res, 'there was an error during a healthcheck', {
      pass: false,
    });
  }
}

export default combine([cors(), method(['GET'])], handler);
