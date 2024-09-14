import { Prisma } from '@prisma/client';
import { config } from '../config';
import { decryptToken } from '../crypto';
import { prisma } from '../db';
import { User, userSelect } from '../db/models/user';
import { NextApiReq, NextApiRes } from '../response';
import { Handler } from './combine';
import { isAdministrator } from '../role';
import { getSession } from '@/server/session';

export type ZiplineAuthOptions = {
  administratorOnly?: boolean;
  select?: Prisma.UserSelect;
};

declare module 'next' {
  export interface NextApiRequest {
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

export function ziplineAuth(options?: ZiplineAuthOptions) {
  return (handler: Handler) => {
    return async (req: NextApiReq, res: NextApiRes) => {
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

        return handler(req, res);
      }

      const session = await getSession(req, res);
      if (!session.id || !session.sessionId) return res.unauthorized('invalid session, not logged in');

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

      if (options?.administratorOnly && !isAdministrator(user.role)) return res.forbidden();

      return handler(req, res);
    };
  };
}
