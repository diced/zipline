import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import type { FastifyInstance } from 'fastify';
import loadRoutes from '../routes';
import { filesRoute } from '../routes/files.dy';
import { urlsRoute } from '../routes/urls.dy';

const logger = log('server');

export async function registerRoutes(server: FastifyInstance, mode: string) {
  const config = global.__config__;

  server.get<{ Params: { id: string } }>('/r/:id', async (req, res) => {
    return res.redirect('/raw/' + req.params.id, 301);
  });

  server.get<{ Params: { id: string } }>('/view/:id', async (_req, res) => {
    return res.ssr('view');
  });

  server.get<{ Params: { id: string } }>('/view/url/:id', async (_req, res) => {
    return res.ssr('view-url');
  });

  server.get<{ Params: { username: string } }>('/user/:username', async (req, res) => {
    return res.serveProfile(req.params.username);
  });

  if (config.files.route === '/' && config.urls.route === '/') {
    logger.debug('files & urls route = /, using catch-all route');

    server.get<{ Params: { id: string } }>('/:id', async (req, res) => {
      const { id } = req.params;

      if (id === '') return res.callNotFound();
      else if (id === 'dashboard') return res.callNotFound(); // todo render dashboard

      const url = await prisma.url.findFirst({
        where: {
          OR: [{ code: id }, { vanity: id }],
        },
      });

      if (url) return urlsRoute(req as any, res);
      else return filesRoute(req as any, res);
    });
  } else {
    server.get(config.files.route === '/' ? '/:id' : `${config.files.route}/:id`, filesRoute);
    server.get(config.urls.route === '/' ? '/:id' : `${config.urls.route}/:id`, urlsRoute);
  }

  const routes = await loadRoutes();
  const routePlugins = Object.values(routes);
  await Promise.all(routePlugins.map((route) => server.register(route)));

  if (mode === 'production') {
    server.serveIndex('/dashboard*');
    server.serveIndex('/auth*');
    server.serveIndex('/folder*');
    server.serveIndex('/user*');
  }

  server.get('/', (_, res) => res.redirect('/dashboard', 301));
}
