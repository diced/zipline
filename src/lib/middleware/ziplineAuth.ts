import { config } from '../config';
import { decryptToken } from '../crypto';
import { prisma } from '../db';
import { NextApiReq, NextApiRes, forbidden, unauthorized } from '../response';
import { Handler } from './combine';

export type ZiplineAuthOptions = {
  administratorOnly?: boolean;
};

export function ziplineAuth(options: ZiplineAuthOptions) {
  return (handler: Handler) => {
    return async (req: NextApiReq, res: NextApiRes) => {
      let rawToken: string | undefined;

      if (req.cookies.zipline_auth) rawToken = req.cookies.zipline_auth;
      else if (req.headers.authorization) rawToken = req.headers.authorization;

      if (!rawToken) return unauthorized(res);

      const [date, token] = decryptToken(rawToken, config.core.secret);

      if (isNaN(new Date(date).getTime())) return unauthorized(res);

      const user = await prisma.user.findUnique({
        where: {
          token,
        },
      });

      if (!user) return unauthorized(res);

      req.user = user;

      if (options.administratorOnly && !user.administrator) return forbidden(res);

      return handler(req, res);
    };
  };
}
