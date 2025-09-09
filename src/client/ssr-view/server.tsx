import '@mantine/charts/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';

import { isCode } from '@/lib/code';
import { config as zConfig } from '@/lib/config';
import type { Config } from '@/lib/config/validate';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { File, fileSelect } from '@/lib/db/models/file';
import { User, userSelect } from '@/lib/db/models/user';
import { parseString } from '@/lib/parser';
import { parserMetrics } from '@/lib/parser/metrics';
import { createZiplineSsr } from '@/lib/ssr/createZiplineSsr';
import type { ZiplineTheme } from '@/lib/theme';
import { readThemes } from '@/lib/theme/file';
import * as cookie from 'cookie';
import { FastifyRequest } from 'fastify';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom';
import { createRoutes } from './routes';

export const getFile = async (id: string) =>
  prisma.file.findFirst({
    where: { name: decodeURIComponent(id) },
    select: {
      ...fileSelect,
      password: true,
      userId: true,
      thumbnail: { select: { path: true } },
      tags: { select: { id: true, name: true, color: true } },
      Folder: { select: { id: true, public: true, name: true } },
    },
  });

export async function render(
  {
    defaultTheme,
    req,
  }: {
    themes: ZiplineTheme[];
    defaultTheme: Config['website']['theme'];
    req: FastifyRequest;
  },
  url: string,
) {
  const id = url.split('/').pop();
  if (!id) return { html: 'Not Found', meta: '', status: 404 };

  const { config: libConfig, reloadSettings } = await import('@/lib/config');
  if (!libConfig) await reloadSettings();

  const file = await getFile(id);
  if (!file || !file.userId) return { html: 'Not Found', meta: '', status: 404 };

  if (file.maxViews && file.views >= file.maxViews) return { html: 'Gone', meta: '', status: 410 };
  if (file.deletesAt && file.deletesAt <= new Date()) return { html: 'Expired', meta: '', status: 410 };

  const user = await prisma.user.findFirst({
    where: { id: file.userId },
    select: {
      ...userSelect,
      oauthProviders: false,
      passkeys: false,
      sessions: false,
      totpSecret: false,
      quota: false,
    },
  });
  if (!user) return { html: 'Not Found', meta: '', status: 404 };

  let host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'];
  try {
    if (
      JSON.parse(req.headers['cf-visitor'] as string)?.scheme === 'https' ||
      proto === 'https' ||
      zConfig.core.returnHttpsUrls
    ) {
      host = `https://${host}`;
    } else {
      host = `http://${host}`;
    }
  } catch {
    host = proto === 'https' || zConfig.core.returnHttpsUrls ? `https://${host}` : `http://${host}`;
  }

  const code = await isCode(file.name);
  const themes = await readThemes();
  const metrics = await parserMetrics(user.id);
  const config = { website: { theme: zConfig.website.theme } };

  const cookies = cookie.parse(req.headers.cookie || '');
  const pw = cookies[`file_pw_${file.id}`];
  const hasPassword = !!file.password;

  if (hasPassword) {
    if (pw) {
      const verified = await verifyPassword(pw, file.password!);
      if (!verified) return { html: 'Forbidden', meta: '', status: 403 };
      delete (file as any).password;
    } else {
      delete (file as any).password;
      const data = {
        file: { id: file.id, name: file.name, type: file.type },
        password: true,
        code,
        user,
        host,
        themes,
        metrics,
        config,
      };

      const routes = createRoutes(themes, defaultTheme);
      const { query } = createStaticHandler(routes);
      const context = await query(
        new Request('http://client' + url, {
          method: 'GET',
          headers: new Headers({ accept: 'text/html' }),
        }),
      );

      if (context instanceof Response) {
        return context;
      }
      const router = createStaticRouter(routes, context);
      const html = renderToString(<StaticRouterProvider context={context} router={router} />);

      return {
        html,
        meta: `<title>Password Protected</title>\n${createZiplineSsr(data)}`,
      };
    }
  }

  const data = {
    file,
    password: hasPassword,
    pw: pw || null,
    code,
    user,
    host,
    themes,
    metrics,
    filesRoute: zConfig.files.route,
    config,
  };

  const routes = createRoutes(themes, defaultTheme);
  const { query } = createStaticHandler(routes);
  const context = await query(
    new Request('http://client' + url, {
      method: 'GET',
      headers: new Headers({ accept: 'text/html' }),
    }),
  );

  if (context instanceof Response) {
    return context;
  }

  const router = createStaticRouter(routes, context);
  const html = renderToString(<StaticRouterProvider context={context} router={router} />);

  const meta = `
  ${
    user?.view?.embedTitle && user.view.embed
      ? `<meta property="og:title" content="${
          parseString(user.view.embedTitle, {
            file: file as unknown as File,
            user: user as User,
            ...metrics,
          }) ?? ''
        }" />`
      : ''
  }
  ${
    user?.view?.embedDescription && user.view.embed
      ? `<meta property="og:description" content="${
          parseString(user.view.embedDescription, {
            file: file as unknown as File,
            user: user as User,
            ...metrics,
          }) ?? ''
        }" />`
      : ''
  }
  ${
    user?.view?.embedSiteName && user.view.embed
      ? `<meta property="og:site_name" content="${
          parseString(user.view.embedSiteName, {
            file: file as unknown as File,
            user: user as User,
            ...metrics,
          }) ?? ''
        }" />`
      : ''
  }
  ${
    user?.view?.embedColor && user.view.embed
      ? `<meta property="theme-color" content="${
          parseString(user.view.embedColor, {
            file: file as unknown as File,
            user: user as User,
            ...metrics,
          }) ?? ''
        }" />`
      : ''
  }

  ${
    file.type?.startsWith('image')
      ? `
    <meta property="og:type" content="image" />
    <meta property="og:image" itemProp="image" content="${host}/raw/${file.name}" />
    <meta property="og:url" content="${host}/raw/${file.name}" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:image" content="${host}/raw/${file.name}" />
    <meta property="twitter:title" content="${file.name}" />
  `
      : ''
  }

  ${
    file.type?.startsWith('video')
      ? `
    ${file.thumbnail ? `<meta property="og:image" content="${host}/raw/${file.thumbnail.path}" />` : ''}
    <meta property="og:type" content="video.other" />
    <meta property="og:video:url" content="${host}/raw/${file.name}" />
    <meta property="og:video:width" content="1920" />
    <meta property="og:video:height" content="1080" />
  `
      : ''
  }

  ${
    file.type?.startsWith('audio')
      ? `
    <meta name="twitter:card" content="player" />
    <meta name="twitter:player" content="${host}/raw/${file.name}" />
    <meta name="twitter:player:stream" content="${host}/raw/${file.name}" />
    <meta name="twitter:player:stream:content_type" content="${file.type}" />
    <meta name="twitter:title" content="${file.name}" />
    <meta name="twitter:player:width" content="720" />
    <meta name="twitter:player:height" content="480" />

    <meta property="og:type" content="music.song" />
    <meta property="og:url" content="${host}/raw/${file.name}" />
    <meta property="og:audio" content="${host}/raw/${file.name}" />
    <meta property="og:audio:secure_url" content="${host}/raw/${file.name}" />
    <meta property="og:audio:type" content="${file.type}" />
  `
      : ''
  }

  ${
    !file.type?.startsWith('video') && !file.type?.startsWith('image')
      ? `
    <meta property="og:url" content="${host}/raw/${file.name}" />
  `
      : ''
  }

  <title>${file.name}</title>
`;

  return {
    html,
    meta: `${meta}\n${createZiplineSsr(data)}`,
  };
}
