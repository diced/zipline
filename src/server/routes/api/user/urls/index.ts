import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { cleanUrlPasswords, Url, urlSchema } from '@/lib/db/models/url';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { zStringTrimmed } from '@/lib/validation';
import { onShorten } from '@/lib/webhooks';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { z } from 'zod';

export type ApiUserUrlsResponse =
  | Url[]
  | ({
      url: string;
    } & Omit<Url, 'password'>);

export const PATH = '/api/user/urls';
const logger = log('api').c('user').c('urls');

export default typedPlugin(
  async (server) => {
    const rateLimit = server.rateLimit
      ? server.rateLimit()
      : (_req: any, _res: any, next: () => any) => next();

    server.post(
      PATH,
      {
        schema: {
          description:
            'Create a new shortened URL for the authenticated user, with optional vanity, password, and max-views settings.',
          body: z.object({
            vanity: zStringTrimmed.max(100).nullish(),
            destination: z.string().min(1),
            enabled: z.boolean().optional(),
          }),
          headers: z.object({
            'x-zipline-max-views': z.coerce.number().min(1).optional(),
            'x-zipline-no-json': z
              .enum(['false', 'true'])
              .transform((val) => val.toLowerCase() === 'true')
              .optional(),
            'x-zipline-domain': z.string().optional(),
            'x-zipline-password': z.string().optional(),
          }),
          response: {
            200: z.union([
              z.string(),
              urlSchema.omit({ password: true }).extend({
                url: z.string(),
              }),
            ]),
          },
        },
        preHandler: [userMiddleware, rateLimit],
      },
      async (req, res) => {
        const { vanity, destination, enabled } = req.body;
        const noJson = req.headers['x-zipline-no-json'];

        const countUrls = await prisma.url.count({
          where: {
            userId: req.user.id,
          },
        });
        if (req.user.quota && req.user.quota.maxUrls && countUrls + 1 > req.user.quota.maxUrls)
          throw new ApiError(
            3012,
            `Shortening this URL would exceed your quota of ${req.user.quota.maxUrls} URLs.`,
          );

        let returnDomain;
        const headerDomain = req.headers['x-zipline-domain'];
        if (headerDomain) {
          const domainArray = headerDomain.split(',');
          returnDomain = domainArray[Math.floor(Math.random() * domainArray.length)].trim();
        }

        const maxViews = req.headers['x-zipline-max-views'];

        const password = req.headers['x-zipline-password']
          ? await hashPassword(req.headers['x-zipline-password'])
          : undefined;

        if (vanity) {
          const existingVanity = await prisma.url.findFirst({
            where: {
              vanity: vanity,
            },
          });

          if (existingVanity) throw new ApiError(1042);
        }

        let code, existingCode;
        do {
          code = randomCharacters(config.urls.length);
          existingCode = await prisma.url.findFirst({ where: { code } });
        } while (existingCode);

        const url = await prisma.url.create({
          data: {
            userId: req.user.id,
            destination: destination,
            code,
            ...(vanity && { vanity: vanity }),
            ...(maxViews && { maxViews: maxViews }),
            ...(password && { password: password }),
            ...(enabled !== undefined && { enabled: enabled }),
          },
          omit: {
            password: true,
          },
        });

        let domain;
        if (returnDomain) {
          domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${returnDomain}`;
        } else if (config.core.defaultDomain) {
          domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${config.core.defaultDomain}`;
        } else {
          domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${req.headers.host}`;
        }

        const responseUrl = `${domain}${
          config.urls.route === '/' || config.urls.route === '' ? '' : `${config.urls.route}`
        }/${url.vanity ?? url.code}`;

        logger.info(`${req.user.username} shortened a URL`, {
          from: destination,
          to: responseUrl,
          user: req.user.id,
        });

        onShorten(config, {
          user: req.user,
          url,
          link: {
            returned: responseUrl,
          },
        });

        if (noJson) return res.type('text/plain').send(responseUrl);

        return res.send({
          ...url,
          url: responseUrl,
        });
      },
    );

    server.get(
      PATH,
      {
        schema: {
          description: 'List or search shortened URLs owned by the authenticated user.',
          querystring: z.object({
            searchField: z.enum(['destination', 'vanity', 'code']).default('destination'),
            searchQuery: z.string().min(1).optional(),
          }),
          response: {
            200: z.array(urlSchema.omit({ password: true })),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { searchField, searchQuery } = req.query;

        if (searchQuery) {
          const similarityResult = await prisma.url.findMany({
            where: {
              [searchField]: {
                mode: 'insensitive',
                contains: searchQuery,
              },
              userId: req.user.id,
            },
            omit: {
              password: true,
            },
          });

          return res.send(similarityResult);
        }

        const urls = await prisma.url.findMany({
          where: {
            userId: req.user.id,
          },
        });

        return res.send(cleanUrlPasswords(urls));
      },
    );
  },
  { name: PATH },
);
