import { config } from '@/lib/config';
import { serializeCookie } from '@/lib/cookie';
import { encryptToken, verifyPassword } from '@/lib/crypto';
import { User, getUser } from '@/lib/db/queries/user';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

type Data = {
  user: User;
  token: string;
};

type Body = {
  username: string;
  password: string;
};

async function handler(req: NextApiReq<Body>, res: NextApiRes<Data>) {
  const { username, password } = req.body;

  if (!username) return res.badRequest('Username is required');
  if (!password) return res.badRequest('Password is required');

  const user = await getUser({ username }, { password: true, token: true });
  if (!user) return res.badRequest('Invalid username');

  if (!user.password) return res.badRequest('User does not have a password, login through a provider');
  const valid = await verifyPassword(password, user.password);
  if (!valid) return res.badRequest('Invalid password');

  const token = encryptToken(user.token!, config.core.secret);

  const cookie = serializeCookie('zipline_token', token, {
    // week
    maxAge: 60 * 60 * 24 * 7,
    expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    path: '/',
    sameSite: 'lax',
  });

  res.setHeader('Set-Cookie', cookie);

  delete user.token;
  delete user.password;

  return res.ok({
    token,
    user,
  });
}

export default combine([cors(), method(['POST'])], handler);
