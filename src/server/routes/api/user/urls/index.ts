import { config } from '@/lib/config';
import { hashPassword, randomCharacters } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { Url } from '@/lib/db/models/url';
import { log } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { onShorten } from '@/lib/discord';
import fastifyPlugin from 'fastify-plugin';
import { userMiddleware } from '@/server/middleware/user';

export type ApiUserUrlsResponse =
  | Url[]
  | {
      url: string;
    };

type Body = {
  vanity?: string;
  destination: string;
};

type Headers = {
  'x-zipline-max-views': string;
  'x-zipline-no-json': string;
  'x-zipline-domain': string;
  'x-zipline-password': string;
};

type Query = {
  searchField?: 'destination' | 'vanity' | 'code';
  searchQuery?: string;
  searchThreshold?: string;
};

export const PATH = '/api/user/urls';

const validateSearchField = z.enum(['destination', 'vanity', 'code']).default('destination');
const validateThreshold = z.number().default(0.1);

const logger = log('api').c('user').c('urls');

export default fastifyPlugin(
  (server, _, done) => {
    const rateLimit = server.rateLimit();

    server.post<{ Body: Body; Headers: Headers }>(
      PATH,
      { preHandler: [userMiddleware, rateLimit] },
      async (req, res) => {
        const { vanity, destination } = req.body;
        const noJson = !!req.headers['x-zipline-no-json'];

        const countUrls = await prisma.url.count({
          where: {
            userId: req.user.id,
          },
        });
        if (req.user.quota && req.user.quota.maxUrls && countUrls + 1 > req.user.quota.maxUrls)
          return res.forbidden(
            `shortenning this url would exceed your quota of ${req.user.quota.maxUrls} urls`,
          );

        let maxViews: number | undefined;
        const returnDomain = req.headers['x-zipline-domain'];

        const maxViewsHeader = req.headers['x-zipline-max-views'];
        if (maxViewsHeader) {
          maxViews = Number(maxViewsHeader);
          if (isNaN(maxViews)) return res.badRequest('Max views must be a number');
          if (maxViews < 0) return res.badRequest('Max views must be greater than 0');
        }

        const password = req.headers['x-zipline-password']
          ? await hashPassword(req.headers['x-zipline-password'])
          : undefined;

        if (!destination) return res.badRequest('Destination is required');

        if (vanity) {
          const existingVanity = await prisma.url.findFirst({
            where: {
              vanity: vanity,
            },
          });

          if (existingVanity) return res.badRequest('Vanity already taken');
        }

        const url = await prisma.url.create({
          data: {
            userId: req.user.id,
            destination: destination,
            code: randomCharacters(config.urls.length),
            ...(vanity && { vanity: vanity }),
            ...(maxViews && { maxViews: maxViews }),
            ...(password && { password: password }),
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

        onShorten({
          user: req.user,
          url,
          link: {
            returned: responseUrl,
          },
        });

        if (noJson) return res.type('text/plain').send(responseUrl);

        return res.send({
          url: responseUrl,
        });
      },
    );

    server.get<{ Querystring: Query }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const searchQuery = req.query.searchQuery
        ? decodeURIComponent(req.query.searchQuery.trim()) ?? null
        : null;
      const searchField = validateSearchField.safeParse(req.query.searchField || 'destination');
      if (!searchField.success) return res.badRequest('Invalid searchField value');

      const searchThreshold = validateThreshold.safeParse(Number(req.query.searchThreshold) || 0.1);
      if (!searchThreshold.success) return res.badRequest('Invalid searchThreshold value');

      if (searchQuery) {
        const similarityResult: Url[] = await prisma.$queryRaw`
      SELECT
        word_similarity("${Prisma.raw(searchField.data)}", ${searchQuery}) AS similarity,
        *
      FROM "Url"
      WHERE
        word_similarity("${Prisma.raw(searchField.data)}", ${searchQuery}) > ${Prisma.raw(
          String(searchThreshold.data),
        )} OR
        "${Prisma.raw(searchField.data)}" ILIKE '${Prisma.sql`%${searchQuery}%`}' AND
        "userId" = ${req.user.id};
    `;

        return res.send(similarityResult);
      }

      const urls = await prisma.url.findMany({
        where: {
          userId: req.user.id,
        },
      });

      return res.send(urls);
    });

    done();
  },
  { name: PATH },
);
