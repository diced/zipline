import { Prisma } from '@prisma/client';
import { config } from '../config';
import { decryptToken } from '../crypto';
import { prisma } from '../db';
import { User, userSelect } from '../db/models/user';
import { NextApiReq, NextApiRes } from '../response';
import { Handler } from './combine';

export type ZiplineAuthOptions = {
  administratorOnly?: boolean;
  select?: Prisma.UserSelect;
};

declare module 'next' {
  export interface NextApiRequest {
    user: User;
  }
}

export function ziplineAuth(options?: ZiplineAuthOptions) {
  return (handler: Handler) => {
    return async (req: NextApiReq, res: NextApiRes) => {
      let rawToken: string | undefined;

      if (req.cookies.zipline_token) rawToken = req.cookies.zipline_token;
      else if (req.headers.authorization) rawToken = req.headers.authorization;

      if (!rawToken) return res.unauthorized();

      const decryptedToken = decryptToken(rawToken, config.core.secret);
      if (!decryptedToken) return res.unauthorized('could not decrypt token');

      const [date, token] = decryptedToken;
      if (isNaN(new Date(date).getTime())) return res.unauthorized('could not decrypt token date');

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

      if (options?.administratorOnly && !user.administrator) return res.forbidden();

      return handler(req, res);
    };
  };
}
