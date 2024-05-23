import { Prisma } from '@prisma/client';
import { config } from '../config';
import { decryptToken } from '../crypto';
import { prisma } from '../db';
import { User, userSelect } from '../db/models/user';
import { NextApiReq, NextApiRes } from '../response';
import { Handler } from './combine';
import { isAdministrator } from '../role';

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
        select: {
          ...userSelect,
          ...(options?.select && options.select),
        },
      });
      if (!user) return res.unauthorized();

      req.user = user;

      if (options?.administratorOnly && !isAdministrator(user.role)) return res.forbidden();

      return handler(req, res);
    };
  };
}
