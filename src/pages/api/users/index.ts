import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { readFile } from 'fs/promises';

export type ApiUsersIdResponse = User[] | User;

type Body = {
  username?: string;
  password?: string;
  avatar?: string;
  administrator?: boolean;
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUsersIdResponse>) {
  if (req.method === 'POST') {
    const { username, password, avatar, administrator } = req.body;

    if (!username) return res.badRequest('Username is required');
    if (!password) return res.badRequest('Password is required');

    let avatar64 = null;

    if (config.website.defaultAvatar) {
      avatar64 = (await readFile(config.website.defaultAvatar)).toString('base64');
    } else if (avatar) {
      avatar64 = avatar;
    }

    const user = await prisma.user.create({
      data: {
        username,
        password: await hashPassword(password),
        administrator: administrator ?? false,
        avatar: avatar64 ?? null,
        token: createToken(),
      },
      select: userSelect,
    });

    return res.ok(user);
  }

  const users = await prisma.user.findMany({
    select: userSelect,
  });

  return res.ok(users);
}

export default combine([method(['GET', 'POST']), ziplineAuth({ administratorOnly: true })], handler);
