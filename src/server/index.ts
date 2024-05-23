import { readEnv } from '@/lib/config/read';
import { validateEnv } from '@/lib/config/validate';
import { prisma } from '@/lib/db';
import { runMigrations } from '@/lib/db/migration';
import { log } from '@/lib/logger';
import { Scheduler } from '@/lib/scheduler';
import clearInvites from '@/lib/scheduler/jobs/clearInvites';
import deleteFiles from '@/lib/scheduler/jobs/deleteFiles';
import maxViews from '@/lib/scheduler/jobs/maxViews';
import metrics from '@/lib/scheduler/jobs/metrics';
import thumbnails from '@/lib/scheduler/jobs/thumbnails';
import { fastifyCookie } from '@fastify/cookie';
import { fastifyCors } from '@fastify/cors';
import { fastifySensible } from '@fastify/sensible';
import { fastifyMultipart } from '@fastify/multipart';
import fastify from 'fastify';
import { mkdir } from 'fs/promises';
import { parse } from 'url';
import { version } from '../../package.json';
import next, { ALL_METHODS } from './plugins/next';
import loadRoutes from './routes';
import { filesRoute } from './routes/files.dy';
import { urlsRoute } from './routes/urls.dy';

const MODE = process.env.NODE_ENV || 'production';
const logger = log('server');

declare global {
  interface BigInt {
    toJSON(): number;
  }
}

BigInt.prototype.toJSON = function () {
  return Number(this.toString());
};

async function main() {
  logger.info('starting zipline', { mode: MODE, version: version });
  logger.info('reading environment for configuration');
  const config = validateEnv(readEnv());

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local!.directory, { recursive: true });
  }

  await mkdir(config.core.tempDirectory, { recursive: true });
  process.env.DATABASE_URL = config.core.databaseUrl;

  await runMigrations();

  const server = fastify({ ignoreTrailingSlash: true });

  await server.register(fastifyCookie, {
    secret: config.core.secret,
    hook: 'onRequest',
  });

  await server.register(fastifyCors);

  await server.register(fastifySensible);

  await server.register(fastifyMultipart);

  if (config.files.route === '/' && config.urls.route === '/') {
    logger.debug('files & urls route = /, using catch-all route');

    server.get<{ Params: { id: string } }>('/:id', async (req, res) => {
      const { id } = req.params;
      const parsedUrl = parse(req.url!, true);

      if (id === '') return server.nextServer.render404(req.raw, res.raw, parsedUrl);
      else if (id === 'dashboard') return server.nextServer.render(req.raw, res.raw, '/dashboard');

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

  await server.register(next, {
    dev: MODE === 'development',
    quiet: MODE === 'production',
    hostname: config.core.hostname,
    port: config.core.port,
    dir: '.',
  });

  const routes = await loadRoutes();
  const routesOptions = Object.values(routes);
  Promise.all(routesOptions.map((route) => server.register(route)));

  server.next('/*', ALL_METHODS);
  server.get('/', (_, res) => res.redirect('/dashboard'));

  // TODO: no longer need this when all the api routes are handled by fastify :)
  const routeKeys = Object.keys(routes); // holds "currently migrated routes" so we can parse json through fastify
  server.addContentTypeParser('application/json', (req, body, done) => {
    if (routeKeys.includes(req.routeOptions.config.url)) {
      let bodyString = '';
      body.on('data', (chunk) => {
        bodyString += chunk;
      });

      body.on('end', () => {
        server.getDefaultJsonParser('error', 'ignore')(req, bodyString, done);
      });
    } else done(null, body);
  });

  await server.listen({
    port: config.core.port,
    host: config.core.hostname,
  });

  logger.info('server started', { hostname: config.core.hostname, port: config.core.port });

  const scheduler = new Scheduler();
  scheduler.interval('deletefiles', config.scheduler.deleteInterval, deleteFiles(prisma));
  scheduler.interval('maxviews', config.scheduler.maxViewsInterval, maxViews(prisma));

  if (config.features.metrics)
    scheduler.interval('metrics', config.scheduler.metricsInterval, metrics(prisma));

  if (config.features.thumbnails.enabled) {
    scheduler.interval('thumbnails', config.scheduler.thumbnailsInterval, thumbnails(prisma));

    for (let i = 0; i !== config.features.thumbnails.num_threads; ++i) {
      scheduler.worker(`thumbnail-${i}`, './build/offload/thumbnails.js', {
        id: `thumbnail-${i}`,
        enabled: config.features.thumbnails.enabled,
      });
    }

    scheduler.interval('clearinvites', config.scheduler.clearInvitesInterval, clearInvites(prisma));
  }

  logger.info('starting scheduler');
  // scheduler.start(); TODO: getting annoyed, remove this comment later
}

main();
