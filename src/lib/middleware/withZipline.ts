import type { NextApiRequest, NextApiResponse } from 'next';
import type { CookieSerializeOptions } from 'cookie';

import { serialize } from 'cookie';
import { sign64, unsign64 } from 'lib/util';
import config from 'lib/config';
import prisma from 'lib/prisma';

export interface NextApiFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export type NextApiReq = NextApiRequest & {
  user: () => Promise<{
    username: string;
    token: string;
    embedTitle: string;
    embedColor: string;
    systemTheme: string;
    administrator: boolean;
    id: number;
    password: string;
    domains: string[];
    avatar?: string;
  } | null | void>;
  getCookie: (name: string) => string | null;
  cleanCookie: (name: string) => void;
  files?: NextApiFile[];
}

export type NextApiRes = NextApiResponse & {
  error: (message: string) => void;
  forbid: (message: string, extra?: any) => void;
  bad: (message: string) => void;
  json: (json: Record<string, any>, status?: number) => void;
  ratelimited: (remaining: number) => void;
  setCookie: (name: string, value: unknown, options: CookieSerializeOptions) => void;
}

export const withZipline = (handler: (req: NextApiRequest, res: NextApiResponse) => unknown) => (req: NextApiReq, res: NextApiRes) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Content-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');

  res.error = (message: string) => {
    res.json({
      error: message,
    }, 500);
  };

  res.forbid = (message: string, extra: any = {}) => {
    res.json({
      error: '403: ' + message,
      ...extra,
    }, 403);
  };

  res.bad = (message: string) => {
    res.json({
      error: '401: ' + message,
    }, 401);
  };

  res.ratelimited = (remaining: number) => {
    res.status(429);
    res.setHeader('X-Ratelimit-Remaining', Math.floor(remaining / 1000));
    res.json({
      error: '429: ratelimited',
    });
  };

  res.json = (json: any, status: number = 200) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(status);
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
          token: true,
          username: true,
          domains: true,
          avatar: true,
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
