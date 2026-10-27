import { verifyAccessToken } from '@/lib/accessToken';
import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { getUrl } from '@/lib/db/models/url';
import { getUserSummary } from '@/lib/db/models/user';
import { urls } from '@/lib/db/schema';
import {
  serializeDiscordComponentEmbed,
  createComponentPreviewHtml,
  createNoPreviewHtml,
  isDiscordCrawler,
} from '@/lib/discord';
import { log } from '@/lib/logger';
import { and, eq, lt, sql } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

type Params = {
  id: string;
};

type Query = {
  token?: string;
};

const logger = log('server').c('urls');

export async function urlsRoute(
  req: FastifyRequest<{ Params: Params; Querystring: Query }>,
  res: FastifyReply,
) {
  const { id } = req.params;
  const { token } = req.query;

  const url = await getUrl(id);
  if (!url) return res.callNotFound();
  if (!url.enabled) return res.callNotFound();

  if (url.maxViews && url.views >= url.maxViews) {
    if (config.features.deleteOnMaxViews) {
      await db.delete(urls).where(eq(urls.id, url.id));
    }
    return res.callNotFound();
  }

  if (url.password) {
    const valid = verifyAccessToken(token, 'url', url.id);
    if (!valid) return res.redirect(`/view/url/${url.id}`);
  }

  if (isDiscordCrawler(req.headers['user-agent'])) {
    if (url.discordPreviewMode === 'none') {
      return res.header('Cache-Control', 'no-store').type('text/html').send(createNoPreviewHtml());
    }

    if (url.discordPreviewMode === 'components') {
      const host = req.headers.host ?? req.hostname;
      const shortUrl = new URL(req.raw.url ?? req.url, `${req.protocol}://${host}`).toString();
      const { password: _password, discordComponentEmbed: _componentEmbed, ...publicUrl } = url;
      const user = url.userId ? await getUserSummary(url.userId) : null;
      const componentEmbed = serializeDiscordComponentEmbed(url.discordComponentEmbed, {
        url: publicUrl,
        user: user ?? undefined,
        link: { returned: shortUrl, raw: url.destination },
      });

      return res
        .header('Cache-Control', 'no-store')
        .type('text/html')
        .send(createComponentPreviewHtml(shortUrl, url.destination, componentEmbed));
    }
  }

  const [updated] = await db
    .update(urls)
    .set({ views: sql`${urls.views} + 1` })
    .where(and(eq(urls.id, url.id), url.maxViews ? lt(urls.views, urls.maxViews) : undefined))
    .returning({ id: urls.id });
  if (!updated) {
    if (!url.maxViews) throw new ApiError(9002);

    if (config.features.deleteOnMaxViews) {
      await db.delete(urls).where(eq(urls.id, url.id));

      logger.info(`${url.code} deleted due to reaching max views`, {
        id: url.id,
        views: url.maxViews,
        vanity: url.vanity ?? 'none',
      });
    }

    return res.callNotFound();
  }

  return res.redirect(url.destination);
}
