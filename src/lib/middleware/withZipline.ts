import type { CookieSerializeOptions } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

import { OAuth, User } from '@prisma/client';
import { serialize } from 'cookie';
import { HTTPMethod } from 'find-my-way';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { sign64, unsign64 } from 'lib/utils/crypto';

export interface NextApiFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface UserExtended extends User {
  oauth: OAuth[];
}

export type NextApiReq = NextApiRequest & {
  user: () => Promise<UserExtended | null>;
  getCookie: (name: string) => string | null;
  cleanCookie: (name: string) => void;
  files?: NextApiFile[];
};

export type NextApiResExtra =
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'ratelimited'
  | 'notFound'
  | 'error';
export type NextApiResExtraObj = {
  [key in NextApiResExtra]: (message: any, extra?: Record<string, any>) => void;
};

export type NextApiRes = NextApiResponse &
  NextApiResExtraObj & {
    json: (json: Record<string, any>, status?: number) => void;
    setCookie: (name: string, value: unknown, options: CookieSerializeOptions) => void;
    setUserCookie: (id: number) => void;
  };

export type ZiplineApiConfig = {
  methods: HTTPMethod[];
  user?: boolean;
  administrator?: boolean;
};

export const withZipline =
  (
    handler: (req: NextApiRequest, res: NextApiResponse, user?: UserExtended) => Promise<unknown>,
    api_config: ZiplineApiConfig = { methods: ['GET'] }
  ) =>
  (req: NextApiReq, res: NextApiRes) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Content-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Used when the client sends wrong information, etc.
    res.badRequest = (message: string, extra: Record<string, any> = {}) => {
      res.json(
        {
          error: message,
          code: 400,
          ...extra,
        },
        400
      );
    };

    // If the user is not logged in
    res.unauthorized = (message: string, extra: Record<string, any> = {}) => {
      res.json(
        {
          error: message,
          code: 401,
          ...extra,
        },
        401
      );
    };

    // If the user is logged in but doesn't have permission to do something
    res.forbidden = (message: string, extra: Record<string, any> = {}) => {
      res.json(
        {
          error: message,
          code: 403,
          ...extra,
        },
        403
      );
    };

    res.notFound = (message: string, extra: Record<string, any> = {}) => {
      res.json(
        {
          error: message,
          code: 404,
          ...extra,
        },
        404
      );
    };

    res.ratelimited = (message: number, extra: Record<string, any> = {}) => {
      const retry = Math.floor(message / 1000);

      res.setHeader('X-Ratelimit-Remaining', retry);
      res.json(
        {
          error: `ratelimited - try again in ${retry} seconds`,
          code: 429,
          ...extra,
        },
        429
      );
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
      res.setHeader(
        'Set-Cookie',
        serialize(name, '', {
          path: '/',
          expires: new Date(1),
          maxAge: undefined,
        })
      );
    };

    req.user = async () => {
      try {
        const userId = req.getCookie('user');
        if (!userId) return null;

        const user = await prisma.user.findFirst({
          where: {
            id: Number(userId),
          },
          include: {
            oauth: true,
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

    res.setCookie = (name: string, value: unknown, options: CookieSerializeOptions = {}) => {
      if ('maxAge' in options) {
        options.expires = new Date(Date.now() + options.maxAge * 1000);
        options.maxAge /= 1000;
      }

      const signed = sign64(String(value), config.core.secret);

      res.setHeader('Set-Cookie', serialize(name, signed, options));
    };

    res.setUserCookie = (id: number) => {
      req.cleanCookie('user');
      res.setCookie('user', String(id), {
        sameSite: 'lax',
        expires: new Date(Date.now() + 6.048e8 * 2),
        path: '/',
      });
    };

    if (!api_config.methods.includes(req.method as HTTPMethod)) {
      return res.json(
        {
          error: 'method not allowed',
          code: 405,
        },
        405
      );
    }

    if (api_config.user) {
      return req.user().then((user) => {
        if (!user) return res.unauthorized('not logged in');
        if (api_config.administrator && !user.administrator) return res.forbidden('not an administrator');

        return handler(req, res, user);
      });
    }

    return handler(req, res);
  };
