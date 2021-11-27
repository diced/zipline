import type { NextApiRequest, NextApiResponse } from 'next';
import type { CookieSerializeOptions } from 'cookie';
import type { Image, Theme, User } from '@prisma/client';

import { serialize } from 'cookie';
import { sign64, unsign64 } from '../util';
import config from 'lib/config';
import prisma from 'lib/prisma';

export interface NextApiFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: string;
  size: number;
}

export type NextApiReq = NextApiRequest & {
  user: () => Promise<{
    username: string;
    token: string;
    embedTitle: string;
    embedColor: string;
    systemTheme: string;
    customTheme?: Theme;
    administrator: boolean;
    id: number;
    password: string;
  } | null | void>;
  getCookie: (name: string) => string | null;
  cleanCookie: (name: string) => void;
  files?: NextApiFile[];
}

export type NextApiRes = NextApiResponse & {
  error: (message: string) => void;
  forbid: (message: string) => void;
  bad: (message: string) => void;
  json: (json: any) => void;
  setCookie: (name: string, value: unknown, options: CookieSerializeOptions) => void;
}

// {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
//   'Access-Control-Max-Age': '86400'
// }

export const withZipline = (handler: (req: NextApiRequest, res: NextApiResponse) => unknown) => (req: NextApiReq, res: NextApiRes) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Content-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.error = (message: string) => {
    res.json({
      error: message,
    });
  };

  res.forbid = (message: string) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(403);
    res.json({
      error: '403: ' + message,
    });
  };

  res.bad = (message: string) => {
    res.status(401);
    res.json({
      error: '403: ' + message,
    });
  };

  res.json = (json: any) => {
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
      maxAge: undefined,
    }));
  };
  req.user = async () => {
    try {
      const userId = req.getCookie('user');
      if (!userId) return null;
      
      const user = await prisma.user.findFirst({
        where: {
          id: Number(userId),
        },
        select: {
          administrator: true,
          embedColor: true,
          embedTitle: true,
          id: true,
          password: true,
          systemTheme: true,
          customTheme: true,
          token: true,
          username: true,
        },
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
    options.expires = new Date(Date.now() + options.maxAge * 1000);
    options.maxAge /= 1000;
  }

  const signed = sign64(String(value), config.core.secret);

  res.setHeader('Set-Cookie', serialize(name, signed, options));
};
