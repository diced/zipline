import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { Url, urlSchema } from '@/lib/db/models/url';
import { urls, users } from '@/lib/db/schema';
import { containsText } from '@/lib/db/utils';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { RESERVED_ROUTES } from '@/lib/reservedRoutes';
import { zStringTrimmed } from '@/lib/validation';
import { onShorten } from '@/lib/webhooks';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq, getColumns, isNotNull } from 'drizzle-orm';
import { z } from 'zod';

export type ApiUserUrlsResponse =
  | Url[]
  | ({
      url: string;
    } & Omit<Url, 'password'>);

export const PATH = '/api/user/urls';
const logger = log('api').c('user').c('urls');
const { password: _password, ...urlColumns } = getColumns(urls);

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
            vanity: zStringTrimmed
              .max(100)
              .refine((str) => !str.startsWith('/'), 'Vanity cannot start with a slash.')
              .refine(
                (str) =>
                  !RESERVED_ROUTES.some((route) => {
                    const nStr = `/${str}`.toLowerCase();
                    const nRoute = route.toLowerCase();

                    return nStr === nRoute || nStr.startsWith(`${nRoute}/`);
                  }),
                'Vanity cannot start with a reserved route.',
              )
              .optional()
              .nullish(),
            destination: z.httpUrl().min(1),
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
          const vanityCount = await db.$count(urls, eq(urls.vanity, vanity));
          if (vanityCount > 0) throw new ApiError(1042);
        }

        let code, existingCode;
        do {
          code = randomCharacters(config.urls.length);
          const codeCount = await db.$count(urls, eq(urls.code, code));
          existingCode = codeCount > 0;
        } while (existingCode);

        const url = await db.transaction(async (tx) => {
          await tx.select({ id: users.id }).from(users).where(eq(users.id, req.user.id)).for('update');

          const count = await tx.$count(urls, eq(urls.userId, req.user.id));
          if (req.user.quota?.maxUrls && count + 1 > req.user.quota.maxUrls) return null;

          const [created] = await tx
            .insert(urls)
            .values({
              userId: req.user.id,
              destination,
              code,
              vanity,
              maxViews,
              password,
              enabled,
            })
            .returning(urlColumns);
          if (!created) throw new Error('URL insert did not return a row');
          return created;
        });
        if (!url)
          throw new ApiError(
            3012,
            `Shortening this URL would exceed your quota of ${req.user.quota?.maxUrls} URLs.`,
          );

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
            200: z.array(urlSchema),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { searchField, searchQuery } = req.query;

        let search;
        if (searchQuery) {
          const searchColumn = {
            destination: urls.destination,
            vanity: urls.vanity,
            code: urls.code,
          }[searchField];
          search = containsText(searchColumn, searchQuery);
        }

        const urlList = await db
          .select({
            ...urlColumns,
            password: isNotNull(urls.password).mapWith(Boolean).as('password'),
          })
          .from(urls)
          .where(and(eq(urls.userId, req.user.id), search));
        return res.send(urlList);
      },
    );
  },
  { name: PATH },
);
