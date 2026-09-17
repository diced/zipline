import { verifyAccessToken } from '@/lib/accessToken';
import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { urls } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { and, eq, lt, or, sql } from 'drizzle-orm';
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

  const [url] = await db
    .select()
    .from(urls)
    .where(or(eq(urls.code, id), eq(urls.vanity, id), eq(urls.id, id)))
    .limit(1);
  if (!url) return res.callNotFound();
  if (!url.enabled) return res.callNotFound();

  if (url.password) {
    const valid = verifyAccessToken(token, 'url', url.id);
    if (!valid) return res.redirect(`/view/url/${url.id}`);
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
