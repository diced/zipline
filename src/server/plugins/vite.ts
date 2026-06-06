import { FastifyInstance, FastifyReply, FastifyRequest, HTTPMethods } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createServer } from 'vite';
import { reservedRoutes } from '../routes/api/server/settings';
import { config } from '@/lib/config';
import fastifyStatic from '@fastify/static';
import { renderHtml } from '@/lib/ssr/renderHtml';
import { readThemes } from '@/lib/theme/file';
import { ZIPLINE_SSR_INSERT, ZIPLINE_SSR_META } from '@/lib/ssr/constants';
import { log } from '@/lib/logger';
import { prisma } from '@/lib/db';

export const ALL_METHODS: HTTPMethods[] = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'];

const MODE = process.env.NODE_ENV || 'development';
const logger = log('server').c('plugin').c('vite');

async function vitePlugin(fastify: FastifyInstance) {
  fastify.decorateReply('ssr', ssrRoute);
  fastify.decorateReply('serveProfile', serveProfile);

  if (MODE === 'production') {
    fastify.decorate('serveIndex', route);
    fastify.decorateReply('serveIndex', serveIndex);

    await fastify.register(fastifyStatic, {
      root: resolve('./build/client'),
      prefix: '/',
      decorateReply: false,
    });
  } else {
    const vite = await createServer();

    logger.info('Vite initialized', { mode: MODE });

    fastify.decorate('vite', vite);
    fastify.addHook('preHandler', async (req, reply) => {
      const url = req.raw.url || '';

      const reserved = [
        ...reservedRoutes.filter((x) => x !== '/dashboard' && x !== '/auth' && x !== '/r'),
        config.files.route,
        config.urls.route,
      ]
        .filter((url) => url.trim() !== '/')
        .some((route) => url.startsWith(route));

      if (reserved) return;

      reply.hijack();

      return new Promise<void>((resolve, reject) => {
        vite!.middlewares(req.raw, reply.raw, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async function ssrRoute(this: FastifyReply, type: 'view-url' | 'view') {
    const url = this.request.raw.url || '/';

    try {
      let template: string;
      let render: (response: any, url: string) => Promise<ReturnType<typeof renderHtml>>;

      if (MODE === 'development' && fastify.vite) {
        template = await readFile(resolve(`./src/client/ssr-${type}/`, 'index.html'), 'utf-8');
        template = await fastify.vite.transformIndexHtml(url, template);

        // expose __dirname since dev modules are loaded in esm
        global.__dirname = __dirname;
        render = (await fastify.vite.ssrLoadModule(`/ssr-${type}/server.tsx`)).render;
      } else {
        template = await readFile(resolve('./build', `client/ssr-${type}/index.html`), 'utf-8');
        render = (await import(`../../ssr/ssr-${type}.js`)).render;
      }

      const { html, meta, status, redirect } = await render(
        {
          themes: await readThemes(),
          defaultTheme: config.website.theme,
          req: this.request,
        },
        url,
      );

      if (redirect) {
        return this.redirect(redirect, status);
      }

      if (status && [404, 410].includes(status)) return this.callNotFound();

      const finalHtml = template.replace(ZIPLINE_SSR_META, meta!).replace(ZIPLINE_SSR_INSERT, html);

      return this.type('text/html').send(finalHtml);
    } catch (err) {
      if (MODE === 'development' && fastify.vite) fastify.vite.ssrFixStacktrace(err as Error);
      console.error(err);
      return this.internalServerError();
    }
  }

  function route(this: FastifyInstance, path: string, method: HTTPMethods | HTTPMethods[] = 'GET') {
    this.route({
      method,
      url: path,
      handler,
    });

    async function handler(_: FastifyRequest, reply: FastifyReply) {
      return reply.serveIndex();
    }
  }

  async function serveIndex(this: FastifyReply) {
    return this.sendFile('index.html', resolve('./build/client'));
  }

  async function serveProfile(this: FastifyReply, username: string) {
    const url = this.request.raw.url || '/';

    try {
      const user = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
        select: {
          username: true,
          avatar: true,
          view: true,
        },
      });

      if (!user) return this.callNotFound();

      let template: string;
      if (MODE === 'development' && fastify.vite) {
        template = await readFile(resolve('./src/client/index.html'), 'utf-8');
        template = await fastify.vite.transformIndexHtml(url, template);
      } else {
        template = await readFile(resolve('./build/client/index.html'), 'utf-8');
      }

      const view = (user.view || {}) as any;
      const bioText = view.bio || '';
      const hasAvatar = !!user.avatar;

      let host = this.request.headers.host || 'localhost';
      const proto = this.request.headers['x-forwarded-proto'];
      try {
        if (
          JSON.parse(this.request.headers['cf-visitor'] as string)?.scheme === 'https' ||
          proto === 'https' ||
          config.core.returnHttpsUrls
        ) {
          host = `https://${host}`;
        } else {
          host = `http://${host}`;
        }
      } catch {
        host = proto === 'https' || config.core.returnHttpsUrls ? `https://${host}` : `http://${host}`;
      }

      const pageUrl = `${host}${this.request.raw.url?.split('?')[0]}`;
      // Use the dedicated image endpoint so og:image is a proper absolute URL (not inline base64)
      const avatarUrl = hasAvatar ? `${host}/api/users/${user.username}/avatar` : '';
      const cleanBioText = bioText
        ? bioText
            .replace(/<[^>]*>/g, '')
            .replace(/[\n\r]+/g, ' ')
            .replace(/"/g, '&quot;')
            .slice(0, 160)
        : '';

      const metaTags = [
        `<meta property="og:title" content="${user.username}'s Profile" />`,
        cleanBioText
          ? `<meta property="og:description" content="${cleanBioText}" />`
          : `<meta property="og:description" content="View ${user.username}'s public gallery and uploads on Zipline" />`,
        avatarUrl ? `<meta property="og:image" content="${avatarUrl}" />` : '',
        `<meta property="og:url" content="${pageUrl}" />`,
        '<meta property="og:type" content="profile" />',
        '<meta name="twitter:card" content="summary" />',
        avatarUrl ? `<meta name="twitter:image" content="${avatarUrl}" />` : '',
      ]
        .filter(Boolean)
        .join('\n  ');

      const finalHtml = template
        .replace('<title>Zipline</title>', `<title>${user.username}'s Profile</title>`)
        .replace('</head>', `${metaTags}\n</head>`);

      return this.type('text/html').send(finalHtml);
    } catch (err) {
      console.error(err);
      return this.internalServerError();
    }
  }
}

export default fastifyPlugin(vitePlugin, {
  name: 'vite',
  fastify: '5.x',
});

declare module 'fastify' {
  interface FastifyInstance {
    vite?: Awaited<ReturnType<typeof createServer>>;
    serveIndex: (path: string, method?: HTTPMethods | HTTPMethods[]) => void;
  }

  interface FastifyReply {
    ssr: (type: 'view-url' | 'view') => Promise<void>;
    serveIndex: () => Promise<void>;
    serveProfile: (username: string) => Promise<void>;
  }
}
