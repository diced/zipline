import type { NextApiRequest, NextApiResponse } from 'next';
import type { CookieSerializeOptions } from 'cookie';
import type { User } from '@prisma/client';

import { serialize } from 'cookie';
import { sign64, unsign64 } from '../util';
import config from 'lib/config';
import prisma from 'lib/prisma';

export type NextApiReq = NextApiRequest & {
  user: () => Promise<User | null | void>;
  getCookie: (name: string) => string | null;
  cleanCookie: (name: string) => void;
}

export type NextApiRes = NextApiResponse & {
  error: (message: string) => void;
  forbid: (message: string) => void;
  bad: (message: string) => void;
  json: (json: any) => void;
  setCookie: (name: string, value: unknown, options: CookieSerializeOptions) => void;
}

export const withZipline = (handler: (req: NextApiRequest, res: NextApiResponse) => unknown) => (req: NextApiReq, res: NextApiRes) => {
  res.error = (message: string) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      error: message
    });
  };

  res.forbid = (message: string) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(403);
    res.json({
      error: '403: ' + message
    });
  };

  res.bad = (message: string) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(401);
    res.json({
      error: '403: ' + message
    });
  };

  res.json = (json: any) => {
    res.setHeader('Content-Type', 'application/json');

    res.end(JSON.stringify(json));
  };

  req.getCookie = (name: string) => {
    const cookie = req.cookies[name];
    if (!cookie) return null;

    const unsigned = unsign64(cookie, config.core.secret);
    return unsigned ? unsigned : null;
  };
  req.cleanCookie = (name: string) => {
    res.setHeader('Set-Cookie', serialize(name, '', {
      path: '/',
      expires: new Date(1),
      maxAge: undefined
    }));
  };
  req.user = async () => {
    try {
      const userId = req.getCookie('user');
      if (!userId) return null;
      
      const user = await prisma.user.findFirst({
        where: {
          id: Number(userId)
        }
      });

      if (!user) return null;
      return user;
    } catch (e) {
      if (e.code && e.code === 'ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH') {
        req.cleanCookie('user');
        return null;
      }
    }
  };

  res.setCookie = (name: string, value: unknown, options?: CookieSerializeOptions) => setCookie(res, name, value, options || {});

  return handler(req, res);
};

export const setCookie = (
  res: NextApiResponse,
  name: string,
  value: unknown,
  options: CookieSerializeOptions = {}
) => {
  
  if ('maxAge' in options) {
    options.expires = new Date(Date.now() + options.maxAge);
    options.maxAge /= 1000;
  }

  const signed = sign64(String(value), config.core.secret);

  res.setHeader('Set-Cookie', serialize(name, signed, options));
};