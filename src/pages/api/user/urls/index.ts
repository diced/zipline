import { config } from '@/lib/config';
import { randomCharacters } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { Url } from '@/lib/db/models/url';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { onShorten } from '@/lib/discord';

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
};

type Query = {
  searchField?: 'destination' | 'vanity' | 'code';
  searchQuery?: string;
  searchThreshold?: string;
};

const validateSearchField = z.enum(['destination', 'vanity', 'code']).default('destination');
const validateThreshold = z.number().default(0.1);

const logger = log('api').c('user').c('urls');

export async function handler(req: NextApiReq<Body, Query, Headers>, res: NextApiRes<ApiUserUrlsResponse>) {
  if (req.method === 'POST') {
    const { vanity, destination } = req.body;
    const noJson = !!req.headers['x-zipline-no-json'];
    let maxViews: number | undefined;
    const returnDomain = req.headers['x-zipline-domain'];

    const maxViewsHeader = req.headers['x-zipline-max-views'];
    if (maxViewsHeader) {
      maxViews = Number(maxViewsHeader);
      if (isNaN(maxViews)) return res.badRequest('Max views must be a number');
      if (maxViews < 0) return res.badRequest('Max views must be greater than 0');
    }

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

    if (noJson) return res.status(200).end(responseUrl);

    return res.ok({
      url: responseUrl,
    });
  }

  const searchQuery = req.query.searchQuery ? decodeURIComponent(req.query.searchQuery.trim()) ?? null : null;
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

    return res.ok(similarityResult);
  }

  const urls = await prisma.url.findMany({
    where: {
      userId: req.user.id,
    },
  });

  return res.ok(urls);
}

export default combine([method(['GET', 'POST']), ziplineAuth()], handler);
