import { config } from '@/lib/config';
import { serializeCookie } from '@/lib/cookie';
import { createToken, encryptToken } from '@/lib/crypto';
import { User, updateUser } from '@/lib/db/queries/user';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

type Response = {
  user?: User;
  token?: string;
};

export async function handler(req: NextApiReq, res: NextApiRes<Response>) {
  const user = await updateUser(
    {
      id: req.user.id,
    },
    {
      token: createToken(),
    },
    {
      token: true,
    }
  );

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

  return res.ok({
    user,
    token,
  });
}

export default combine([cors(), method(['PATCH']), ziplineAuth()], handler);
