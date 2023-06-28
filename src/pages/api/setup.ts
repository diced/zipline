import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { getZipline } from '@/lib/db/queries/zipline';
import { NextApiReq, NextApiRes, badRequest, forbidden, methodNotAllowed, ok } from '@/lib/response';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { createToken, hashPassword } from '@/lib/crypto';
import { User } from '@/lib/db/queries/user';

type Response = {
  firstSetup: boolean;
  user: User;
};

type Body = {
  username: string;
  password: string;
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<Response>) {
  const logger = log('api').c('setup');
  const { firstSetup, id } = await getZipline();

  if (!firstSetup) return forbidden(res);

  logger.info('first setup running');

  if (req.method === 'GET') {
    return ok(res, { firstSetup });
  }

  const { username, password } = req.body;
  if (!username) return badRequest(res, 'Username is required');
  if (!password) return badRequest(res, 'Password is required');

  if (password.length < 8) return badRequest(res, 'Password must be at least 8 characters long');

  const user = await prisma.user.create({
    data: {
      username,
      password: await hashPassword(password),
      administrator: true,
      token: createToken(),
    },
    select: {
      administrator: true,
      id: true,
      createdAt: true,
      updatedAt: true,
      username: true,
    },
  });

  logger.info('first setup complete');

  await prisma.zipline.update({
    where: {
      id,
    },
    data: {
      firstSetup: false,
    },
  });

  return ok(res, {
    firstSetup,
    user,
  });
}

export default combine([cors(), method(['GET', 'POST'])], handler);
