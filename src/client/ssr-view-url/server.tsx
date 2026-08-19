import { verifyAccessToken } from '@/lib/accessToken';
import { config as zConfig } from '@/lib/config';
import { Config } from '@/lib/config/validate';
import { deleteUrlById, findUrlForViewByIdentifier, incrementUrlViews } from '@/lib/db/models/url';
import { renderHtml } from '@/lib/ssr/renderHtml';
import { ZiplineTheme } from '@/lib/theme';
import { FastifyRequest } from 'fastify';
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

  const urlEntry = await findUrlForViewByIdentifier(id);

  if (!urlEntry || !urlEntry.enabled) return { html: 'Not Found', meta: '', status: 404 };

  if (urlEntry.maxViews && urlEntry.views >= urlEntry.maxViews) {
    if (zConfig.features.deleteOnMaxViews) {
      await deleteUrlById(urlEntry.id);
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

  await incrementUrlViews(urlEntry.id);

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
