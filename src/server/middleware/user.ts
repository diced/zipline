import { config } from '@/lib/config';
import { decryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { FastifyReply } from 'fastify';
import { FastifyRequest } from 'fastify/types/request';

declare module 'fastify' {
  export interface FastifyRequest {
    user: User;
  }
}

export function parseUserToken(encryptedToken: string | undefined | null): string;
export function parseUserToken(encryptedToken: string | undefined | null, noThrow: true): string | null;
export function parseUserToken(
  encryptedToken: string | undefined | null,
  noThrow: boolean = false,
): string | null {
  if (!encryptedToken) {
    if (noThrow) return null;
    throw { error: 'no token' };
  }

  const decryptedToken = decryptToken(encryptedToken, config.core.secret);
  if (!decryptedToken) {
    if (noThrow) return null;
    throw { error: 'could not decrypt token' };
  }

  const [date, token] = decryptedToken;
  if (isNaN(new Date(date).getTime())) {
    if (noThrow) return null;
    throw { error: 'invalid token' };
  }

  return token;
}

export async function userMiddleware(req: FastifyRequest, res: FastifyReply) {
  let rawToken: string | undefined;

  if (req.cookies.zipline_token) rawToken = req.cookies.zipline_token;
  else if (req.headers.authorization) rawToken = req.headers.authorization;

  try {
    // eslint-disable-next-line no-var
    var token = parseUserToken(rawToken);
  } catch (e) {
    return res.unauthorized((e as { error: string }).error);
  }

  const user = await prisma.user.findFirst({
    where: {
      token,
    },
    select: userSelect,
  });
  if (!user) return res.unauthorized('invalid token');

  req.user = user;
}
