import type { CookieSerializeOptions } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

import { OAuth, Sessions, User } from '@prisma/client';
import { serialize } from 'cookie';
import { HTTPMethod } from 'find-my-way';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { sign64, unsign64 } from 'lib/utils/crypto';
import Logger from 'lib/logger';

export interface NextApiFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface UserOauth extends User {
  oauth: OAuth[];
}
export type UserExtended = UserOauth & {
  embed: UserEmbed;
  sessions: Sessions[];
};

export interface UserEmbed {
  title?: string;
  siteName?: string;
  description?: string;
  color?: string;
}

export type NextApiReq = NextApiRequest & {
  user: () => Promise<UserExtended | null>;
  clearUser: () => Promise<void>;
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
  [key in NextApiResExtra]: (message: string | number, extra?: Record<string, unknown>) => void;
};

export type NextApiRes = NextApiResponse &
  NextApiResExtraObj & {
    json: (json: Record<string, unknown>, status?: number) => void;
    setCookie: (name: string, value: unknown, options: CookieSerializeOptions) => void;
    setUserCookie: (id: string) => Promise<void>;
  };

export type ZiplineApiConfig = {
  methods: HTTPMethod[];
  user?: boolean;
  administrator?: boolean;
};

export const withZipline =
  (
    handler: (req: NextApiRequest, res: NextApiResponse, user?: UserExtended) => Promise<unknown>,
    api_config: ZiplineApiConfig = { methods: ['GET', 'OPTIONS'] },
  ) =>
  (req: NextApiReq, res: NextApiRes) => {
    if (!api_config.methods.includes('OPTIONS')) api_config.methods.push('OPTIONS');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Content-Allow-Methods', api_config.methods.join(','));
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') return res.status(204).end();

    // Used when the client sends wrong information, etc.
    res.badRequest = (message: string, extra: Record<string, unknown> = {}) => {
      res.json(
        {
          error: message,
          code: 400,
          ...extra,
        },
        400,
      );
    };

    // If the user is not logged in
    res.unauthorized = (message: string, extra: Record<string, unknown> = {}) => {
      res.json(
        {
          error: message,
          code: 401,
          ...extra,
        },
        401,
      );
    };

    // If the user is logged in but doesn't have permission to do something
    res.forbidden = (message: string, extra: Record<string, unknown> = {}) => {
      res.json(
        {
          error: message,
          code: 403,
          ...extra,
        },
        403,
      );
    };

    res.notFound = (message: string, extra: Record<string, unknown> = {}) => {
      res.json(
        {
          error: message,
          code: 404,
          ...extra,
        },
        404,
      );
    };

    res.ratelimited = (message: number, extra: Record<string, unknown> = {}) => {
      const retry = Math.floor(message / 1000);

      res.setHeader('X-Ratelimit-Remaining', retry);
      res.json(
        {
          error: `ratelimited - try again in ${retry} seconds`,
          code: 429,
          ...extra,
        },
        429,
      );
    };

    res.json = (json: unknown, status = 200) => {
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
        }),
      );
    };

    req.clearUser = async () => {
      const sessionId = req.getCookie('user');
      if (!sessionId) return null;

      await prisma.sessions.delete({
        where: { uuid: sessionId },
      });
      req.cleanCookie('user');
    };

    req.user = async () => {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          const user = await prisma.user.findFirst({
            where: {
              token: authHeader,
            },
            include: { oauth: true },
          });

          if (user) return user as UserExtended;
        }

        const sessionId = req.getCookie('user');
        if (!sessionId) return null;

        const user = await prisma.user.findFirst({
          where: {
            sessions: {
              some: {
                uuid: sessionId,
              },
            },
          },
          include: {
            oauth: true,
            sessions: true,
          },
        });
        if (!user) return null;
        const session = user.sessions.filter((x) => x.uuid === sessionId)[0];
        if (session.expiresAt < new Date()) {
          await prisma.sessions.delete({
            where: {
              uuid: sessionId,
            },
          });
          return null;
        }
        return user as UserExtended;
      } catch (e) {
        Logger.get('withZipline').debug(e.message);
        if (e.code && e.code === 'ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH') {
          req.cleanCookie('user');
          return null;
        }
      }
    };

    res.setCookie = (name: string, value: string, options: CookieSerializeOptions = {}) => {
      if ('maxAge' in options) {
        options.expires = new Date(Date.now() + options.maxAge * 1000);
        options.maxAge /= 1000;
      }

      const signed = sign64(value, config.core.secret);

      Logger.get('api').debug(`headers(${JSON.stringify(req.headers)}): cookie(${name}, ${value})`);

      res.setHeader('Set-Cookie', serialize(name, signed, options));
    };

    res.setUserCookie = async (id: string) => {
      const user = await prisma.user.findUnique({ where: { uuid: id } });
      const session = await prisma.sessions.create({
        data: {
          expiresAt: new Date(Date.now() + 6.048e8 * 2),
          ip: <string>req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
          userId: user.id,
        },
      });
      req.cleanCookie('user');
      res.setCookie('user', session.uuid, {
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
        405,
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
