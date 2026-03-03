import { config } from '@/lib/config';
import { decryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { FastifyReply } from 'fastify';
import { FastifyRequest } from 'fastify/types/request';
import { getSession } from '../session';
import * as cookie from 'cookie';
import { ApiError } from '@/lib/api/errors';

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
    // throw { error: 'could not decrypt token' };
    throw new ApiError(2001);
  }

  const [date, token] = decryptedToken;
  if (isNaN(new Date(date).getTime())) {
    if (noThrow) return null;

    throw new ApiError(2001);
  }

  return token;
}

export async function userMiddleware(req: FastifyRequest, res: FastifyReply) {
  const cookies = cookie.parse(req.headers.cookie ?? '');

  // conditions met to allow anonymous folder uploads but later handled in the upload route
  const anonFolderUpload =
    req.headers['x-zipline-folder'] &&
    ['/api/upload', '/api/upload/partial'].includes(req.url.toLowerCase().split('?')[0]) &&
    !req.headers.authorization &&
    !cookies['zipline_session'];
  if (anonFolderUpload) return;

  const authorization = req.headers.authorization;

  if (authorization) {
    try {
      // eslint-disable-next-line no-var
      var token = parseUserToken(authorization);
    } catch (e) {
      throw e;
    }

    const user = await prisma.user.findFirst({
      where: {
        token,
      },
      select: userSelect,
    });
    if (!user) throw new ApiError(2001);

    req.user = user;

    return;
  }

  const session = await getSession(req, res);

  if (!session.id || !session.sessionId) throw new ApiError(2000);

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          id: session.sessionId,
        },
      },
    },
    select: userSelect,
  });
  if (!user) throw new ApiError(2001);

  req.user = user;
}
