import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserResponse = {
  user?: User;
  token?: string;
};

type EditBody = {
  username?: string;
  password?: string;
  avatar?: string;
};

export async function handler(req: NextApiReq<EditBody>, res: NextApiRes<ApiUserResponse>) {
  if (req.method === 'GET') {
    return res.ok({ user: req.user, token: req.cookies.zipline_token });
  } else if (req.method === 'PATCH') {
    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...(req.body.username && { username: req.body.username }),
        ...(req.body.password && { password: await hashPassword(req.body.password) }),
        ...(req.body.avatar && { avatar: req.body.avatar }),
      },
      select: {
        ...userSelect,
      },
    });

    return res.ok({ user, token: req.cookies.zipline_token });
  }
}

export default combine([method(['GET', 'PATCH']), ziplineAuth()], handler);
