import { config } from '@/lib/config';
import { serializeCookie } from '@/lib/cookie';
import { encryptToken, verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiLoginResponse = {
  user: User;
  token: string;
};

type Body = {
  username: string;
  password: string;
};

async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiLoginResponse>) {
  const { username, password } = req.body;

  if (!username) return res.badRequest('Username is required');
  if (!password) return res.badRequest('Password is required');

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      ...userSelect,
      password: true,
      token: true,
    },
  });
  if (!user) return res.badRequest('Invalid username', { username: true });

  if (!user.password) return res.badRequest('User does not have a password, login through a provider');
  const valid = await verifyPassword(password, user.password);
  if (!valid) return res.badRequest('Invalid password', { password: true });

  const token = encryptToken(user.token!, config.core.secret);

  const cookie = serializeCookie('zipline_token', token, {
    // week
    maxAge: 60 * 60 * 24 * 7,
    expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    path: '/',
    sameSite: 'lax',
  });

  res.setHeader('Set-Cookie', cookie);

  delete (user as any).token;
  delete (user as any).password;

  return res.ok({
    token,
    user,
  });
}

export default combine([cors(), method(['POST'])], handler);
