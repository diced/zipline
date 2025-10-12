import { config } from '@/lib/config';
import { decryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { FastifyReply } from 'fastify';
import { FastifyRequest } from 'fastify/types/request';
import { getSession } from '../session';
import { parseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

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
  const cookies = parseCookie(req.headers.cookie ?? '');

  const anonFolderUpload =
    req.headers['x-zipline-folder'] &&
    req.url.toLowerCase().trim() === '/api/upload' &&
    !req.headers.authorization &&
    !cookies.has('zipline_session');
  if (anonFolderUpload) return;

  const isPublicUploadEnabled = config.features?.publicUpload === true;
  const isUploadRoute = req.url.toLowerCase().trim() === '/api/upload';
  const hasNoAuth = !req.headers.authorization && !cookies.has('zipline_session');

  if (isPublicUploadEnabled && isUploadRoute && hasNoAuth) {
    return;
  }

  const authorization = req.headers.authorization;

  if (authorization) {
    try {
      // eslint-disable-next-line no-var
      var token = parseUserToken(authorization);
    } catch (e) {
      return res.unauthorized((e as { error: string }).error);
    }

    const user = await prisma.user.findFirst({
      where: {
        token,
      },
      select: userSelect,
    });
    if (!user) return res.unauthorized('invalid authorization token');

    req.user = user;

    return;
  }

  const session = await getSession(req, res);

  if (!session.id || !session.sessionId) return res.unauthorized('not logged in');

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        has: session.sessionId,
      },
    },
    select: userSelect,
  });
  if (!user) return res.unauthorized('invalid login session');

  req.user = user;
}
