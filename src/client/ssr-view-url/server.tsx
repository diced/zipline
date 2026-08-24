import { verifyAccessToken } from '@/lib/accessToken';
import { config as zConfig } from '@/lib/config';
import { Config } from '@/lib/config/validate';
import { db } from '@/lib/db';
import { urls } from '@/lib/db/schema';
import { renderHtml } from '@/lib/ssr/renderHtml';
import { ZiplineTheme } from '@/lib/theme';
import { FastifyRequest } from 'fastify';
import { eq, or, sql } from 'drizzle-orm';
import { createRoutes } from './routes';
import { ApiError } from '@/lib/api/errors';

export async function render(
  {
    themes,
    defaultTheme,
    req,
  }: {
    themes: ZiplineTheme[];
    defaultTheme: Config['website']['theme'];
    req: FastifyRequest<{ Params: { id: string }; Querystring: { token?: string } }>;
  },
  url: string,
) {
  const id = req.params?.id ?? null;
  if (!id) return { html: 'Not Found', meta: '', status: 404 };

  const { config: libConfig, reloadSettings } = await import('@/lib/config');
  if (!libConfig) await reloadSettings();

  const [urlEntry] = await db
    .select({
      id: urls.id,
      password: urls.password,
      destination: urls.destination,
      maxViews: urls.maxViews,
      views: urls.views,
      enabled: urls.enabled,
    })
    .from(urls)
    .where(or(eq(urls.vanity, id), eq(urls.code, id), eq(urls.id, id)))
    .limit(1);

  if (!urlEntry || !urlEntry.enabled) return { html: 'Not Found', meta: '', status: 404 };

  if (urlEntry.maxViews && urlEntry.views >= urlEntry.maxViews) {
    if (zConfig.features.deleteOnMaxViews) {
      await db.delete(urls).where(eq(urls.id, urlEntry.id));
    }
    return { html: 'Gone', meta: '', status: 410 };
  }

  const token = req.query.token;
  const valid = token && urlEntry.password ? verifyAccessToken(token, 'url', urlEntry.id) : false;
  const hasPassword = !!urlEntry.password;
  const { password: _password, ...publicUrl } = urlEntry;

  const data = {
    url: publicUrl,
    password: hasPassword,
    token: valid ? token : null,
  };

  const routes = createRoutes(themes, defaultTheme);

  if (hasPassword && !valid) {
    const { destination: _destination, ...protectedUrl } = publicUrl;
    return renderHtml(routes, { url, data: { ...data, url: protectedUrl }, status: 403 });
  }

  const [updated] = await db
    .update(urls)
    .set({ views: sql`${urls.views} + 1` })
    .where(eq(urls.id, urlEntry.id))
    .returning({ id: urls.id });
  if (!updated) throw new ApiError(9005);

  if (publicUrl.destination) {
    return {
      html: '',
      meta: '',
      redirect: publicUrl.destination,
      status: 301,
    };
  }

  return renderHtml(routes, { url, data, status: 200 });
}
