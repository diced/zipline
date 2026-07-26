import { config } from '@/lib/config';
import { decryptToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { limitedUserSelect, User, userSelect } from '@/lib/db/models/user';
import { FastifyReply } from 'fastify';
import { FastifyRequest } from 'fastify/types/request';
import { getSession } from '../session';
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
    throw new ApiError(2001);
  }

  const decryptedToken = decryptToken(encryptedToken, config.core.secret);
  if (!decryptedToken) {
    if (noThrow) return null;
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
  const path = req.url.toLowerCase().split('?')[0];
  const upload = ['/api/upload', '/api/upload/partial'].includes(path);
  const leanUpload = upload && !config.discord?.onUpload && !config.httpWebhook.onUpload;

  // conditions met to allow anonymous folder uploads but later handled in the upload route
  const anonFolderUpload =
    req.headers['x-zipline-folder'] &&
    upload &&
    !req.headers.authorization &&
    !req.cookies['zipline_session'];
  if (anonFolderUpload) return;

  const authorization = req.headers.authorization;

  if (authorization) {
    const token = parseUserToken(authorization);

    const user = await prisma.user.findFirst({
      where: {
        token,
      },
      select: leanUpload ? limitedUserSelect : userSelect,
    });
    if (!user) throw new ApiError(2001);

    req.user = user as User;

    return;
  }

  const session = await getSession(req, res);
  if (session.tokenAuth) throw new ApiError(2004);

  if (!session.id || !session.sessionId) throw new ApiError(2000);

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          id: session.sessionId,
        },
      },
    },
    select: leanUpload ? limitedUserSelect : userSelect,
  });
  if (!user) throw new ApiError(2001);

  req.user = user as User;
}
