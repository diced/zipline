import { ApiError } from '@/lib/api/errors';
import { hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import {
  Url,
  urlSchema,
  discordUrlPreviewModeSchema,
  lockUrls,
  urlIdentifiersExist,
} from '@/lib/db/models/url';
import { urls } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq, getColumns } from 'drizzle-orm';
import z from 'zod';
import { discordComponentEmbedSchema, serializeDiscordComponentEmbed } from '@/lib/discordComponentEmbed';

export type ApiUserUrlsIdResponse = Omit<Url, 'password'>;

const logger = log('api').c('user').c('urls').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

const { password: _password, ...urlColumns } = getColumns(urls);

export const PATH = '/api/user/urls/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          params: paramsSchema,
          response: {
            200: urlSchema.omit({ password: true }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const [url] = await db
          .select(urlColumns)
          .from(urls)
          .where(and(eq(urls.id, id), eq(urls.userId, req.user.id)));
        if (!url) throw new ApiError(9002);

        return res.send(url);
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          params: paramsSchema,
          body: z.object({
            password: z.string().nullish(),
            vanity: zStringTrimmed.nullish(),
            maxViews: z.number().min(0).nullish(),
            destination: z.httpUrl().optional(),
            enabled: z.boolean().optional(),
            discordPreviewMode: discordUrlPreviewModeSchema.optional(),
            discordComponentEmbed: discordComponentEmbedSchema.nullish(),
          }),
          response: {
            200: urlSchema.omit({ password: true }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const [url] = await db
          .select(urlColumns)
          .from(urls)
          .where(and(eq(urls.id, id), eq(urls.userId, req.user.id)));

        if (!url) throw new ApiError(9002);

        const nextPreviewMode = req.body.discordPreviewMode ?? url.discordPreviewMode;
        const nextComponentEmbed =
          req.body.discordComponentEmbed === undefined
            ? url.discordComponentEmbed
            : req.body.discordComponentEmbed;
        if (nextPreviewMode === 'components' && !nextComponentEmbed?.enabled) {
          throw new ApiError(1000, 'A valid enabled Components V2 layout is required.');
        }
        const nextDestination = req.body.destination ?? url.destination;
        if (
          nextPreviewMode === 'components' &&
          !serializeDiscordComponentEmbed(nextComponentEmbed, {
            url: { ...url, destination: nextDestination },
            user: req.user,
            link: { returned: 'https://zipline.example/go/link', raw: nextDestination },
          })
        ) {
          throw new ApiError(1000, 'The Components V2 layout is invalid or exceeds Discord limits.');
        }

        let password: string | null | undefined = undefined;
        if (req.body.password !== undefined) {
          if (req.body.password === null || req.body.password === '') {
            password = null;
          } else if (typeof req.body.password === 'string') {
            password = await hashPassword(req.body.password);
          } else {
            throw new ApiError(1055);
          }
        }

        const changes = {
          ...(req.body.vanity !== undefined && { vanity: req.body.vanity }),
          ...(req.body.password !== undefined && { password }),
          ...(req.body.maxViews !== undefined && { maxViews: req.body.maxViews }),
          ...(req.body.destination !== undefined && { destination: req.body.destination }),
          ...(req.body.enabled !== undefined && { enabled: req.body.enabled }),
          ...(req.body.discordPreviewMode !== undefined && {
            discordPreviewMode: req.body.discordPreviewMode,
          }),
          ...(req.body.discordComponentEmbed !== undefined && {
            discordComponentEmbed: req.body.discordComponentEmbed,
          }),
        };

        let updatedUrl = url;
        if (Object.keys(changes).length) {
          const updated = await db.transaction(async (tx) => {
            await lockUrls(tx);
            if (req.body.vanity && (await urlIdentifiersExist([req.body.vanity], tx, id)))
              throw new ApiError(1041);

            const [updated] = await tx
              .update(urls)
              .set(changes)
              .where(and(eq(urls.id, id), eq(urls.userId, req.user.id)))
              .returning(urlColumns);

            return updated;
          });

          if (!updated) throw new ApiError(9002);
          updatedUrl = updated;
        }

        logger.info(`${req.user.username} updated URL ${updatedUrl.id}`, {
          updated: Object.keys(req.body),
        });

        return res.send(updatedUrl);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          params: paramsSchema,
          response: {
            200: urlSchema.omit({ password: true }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const [deletedUrl] = await db
          .delete(urls)
          .where(and(eq(urls.id, id), eq(urls.userId, req.user.id)))
          .returning(urlColumns);
        if (!deletedUrl) throw new ApiError(9002);

        logger.info(`${req.user.username} deleted URL ${deletedUrl.id}`, {
          dest: deletedUrl.destination,
        });

        return res.send(deletedUrl);
      },
    );
  },
  { name: PATH },
);
