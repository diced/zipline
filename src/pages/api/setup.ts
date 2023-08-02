import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { getZipline } from '@/lib/db/models/zipline';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiSetupResponse = {
  firstSetup?: boolean;
  user?: User;
};

type Body = {
  username: string;
  password: string;
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiSetupResponse>) {
  const logger = log('api').c('setup');
  const { firstSetup, id } = await getZipline();

  if (!firstSetup) return res.forbidden();

  logger.info('first setup running');

  if (req.method === 'GET') {
    return res.ok({ firstSetup });
  }

  const { username, password } = req.body;
  if (!username) return res.badRequest('Username is required');
  if (!password) return res.badRequest('Password is required');

  const user = await prisma.user.create({
    data: {
      username,
      password: await hashPassword(password),
      role: 'SUPERADMIN',
      token: createToken(),
    },
    select: userSelect,
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

  return res.ok({
    firstSetup,
    user,
  });
}

export default combine([method(['GET', 'POST'])], handler);
