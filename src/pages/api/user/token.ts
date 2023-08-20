import { config } from '@/lib/config';
import { createToken, encryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { loginToken } from '@/lib/login';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserTokenResponse = {
  user?: User;
  token?: string;
};

export async function handler(req: NextApiReq, res: NextApiRes<ApiUserTokenResponse>) {
  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        token: true,
      },
    });

    const token = encryptToken(user!.token, config.core.secret);

    return res.ok({
      token,
    });
  }

  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      token: createToken(),
    },
    select: {
      ...userSelect,
      token: true,
    },
  });

  const token = loginToken(res, user);

  delete (user as any).token;

  return res.ok({
    user,
    token,
  });
}

export default combine([method(['GET', 'PATCH']), ziplineAuth()], handler);
