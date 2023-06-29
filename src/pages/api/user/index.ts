import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User } from '@/lib/db/queries/user';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

type Response = {
  user?: User;
  token?: string;
};

type EditBody = {
  username?: string;
  password?: string;
  avatar?: string;
};

export async function handler(req: NextApiReq<EditBody>, res: NextApiRes<Response>) {
  if (req.method === 'GET') {
    return res.ok({ user: req.user, token: req.cookies.zipline_token });
  } else if (req.method === 'PATCH') {
    await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...(req.body.username && { username: req.body.username }),
        ...(req.body.password && { password: await hashPassword(req.body.password) }),
        ...(req.body.avatar && { avatar: req.body.avatar }),
      },
    });
  }
}

export default combine([cors(), method(['GET', 'PATCH']), ziplineAuth()], handler);
