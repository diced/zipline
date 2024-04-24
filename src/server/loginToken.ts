import { config } from '@/lib/config';
import { serializeCookie } from '@/lib/cookie';
import { encryptToken } from '@/lib/crypto';
import { User } from '@/lib/db/models/user';
import { FastifyReply } from 'fastify';

export function loginToken(res: FastifyReply, user: User) {
  const token = encryptToken(user.token!, config.core.secret);

  const cookie = serializeCookie('zipline_token', token, {
    // week
    maxAge: 60 * 60 * 24 * 7,
    expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    path: '/',
    sameSite: 'lax',
  });

  res.header('Set-Cookie', cookie);

  return token;
}
