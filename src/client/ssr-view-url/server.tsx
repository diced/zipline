import { verifyAccessToken } from '@/lib/accessToken';
import { config as zConfig } from '@/lib/config';
import { Config } from '@/lib/config/validate';
import { db } from '@/lib/db';
import { recordUrlView, removeUrl } from '@/lib/db/models/url';
import { urls } from '@/lib/db/schema';
import { renderHtml } from '@/lib/ssr/renderHtml';
import { ZiplineTheme } from '@/lib/theme';
import { FastifyRequest } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { createRoutes } from './routes';

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

  const urlEntry = await db.query.urls.findFirst({
    columns: {
      id: true,
      password: true,
      destination: true,
      maxViews: true,
      views: true,
      enabled: true,
    },
    where: or(eq(urls.vanity, id), eq(urls.code, id), eq(urls.id, id)),
  });

  if (!urlEntry || !urlEntry.enabled) return { html: 'Not Found', meta: '', status: 404 };

  if (urlEntry.maxViews && urlEntry.views >= urlEntry.maxViews) {
    if (zConfig.features.deleteOnMaxViews) {
      await removeUrl(urlEntry.id);
    }
    return { html: 'Gone', meta: '', status: 410 };
  }

  const token = req.query.token;
  const valid = token && urlEntry.password ? verifyAccessToken(token, 'url', urlEntry.id) : false;
  const hasPassword = !!urlEntry.password;

  const data = {
    url: { ...urlEntry },
    password: hasPassword,
    token: valid ? token : null,
  };

  delete (data.url as any).password;

  const routes = createRoutes(themes, defaultTheme);

  if (hasPassword) {
    if (!valid) {
      delete (data.url as any).destination;
      return renderHtml(routes, { url, data, status: 403 });
    }
  }

  await recordUrlView(urlEntry.id);

  if (data.url.destination) {
    return {
      html: '',
      meta: '',
      redirect: data.url.destination,
      status: 301,
    };
  }

  return renderHtml(routes, { url, data, status: 200 });
}
