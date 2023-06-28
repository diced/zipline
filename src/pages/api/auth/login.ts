import { config } from '@/lib/config';
import { serializeCookie } from '@/lib/cookie';
import { encryptToken, verifyPassword } from '@/lib/crypto';
import { User, getUser, getUserTokenRaw } from '@/lib/db/queries/user';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes, badRequest, ok } from '@/lib/response';

type Data = {
  user: User;
  token: string;
};

type Body = {
  username: string;
  password: string;
}

async function handler(req: NextApiReq<Body>, res: NextApiRes<Data>) {
  const { username, password } = req.body;

  if (!username) return badRequest(res, 'Username is required');
  if (!password) return badRequest(res, 'Password is required');

  const user = await getUser({ username }, { password: true });
  if (!user) return badRequest(res, 'Invalid username');

  if (!user.password) return badRequest(res, 'User does not have a password, login through a provider');
  const valid = await verifyPassword(password, user.password);
  if (!valid) return badRequest(res, 'Invalid password');

  const rawToken = await getUserTokenRaw({ id: user.id });
  if (!rawToken) return badRequest(res, 'User does not have a token');

  const token = encryptToken(rawToken, config.core.secret);

  const cookie = serializeCookie('zipline_token', token, {
    // week
    maxAge: 60 * 60 * 24 * 7,
    expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    path: '/',
    sameSite: 'lax',
  });

  res.setHeader('Set-Cookie', cookie);

  delete user.password;

  return ok(res, {
    user,
    token,
  });
}

export default combine([cors(), method(['POST'])], handler);
