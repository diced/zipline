import { config } from './config';
import { serializeCookie } from './cookie';
import { encryptToken } from './crypto';
import { User } from './db/models/user';
import { NextApiRes } from './response';

export function loginToken(res: NextApiRes, user: User) {
  const token = encryptToken(user.token!, config.core.secret);

  const cookie = serializeCookie('zipline_token', token, {
    // week
    maxAge: 60 * 60 * 24 * 7,
    expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    path: '/',
    sameSite: 'lax',
  });

  res.setHeader('Set-Cookie', cookie);

  return token;
}
