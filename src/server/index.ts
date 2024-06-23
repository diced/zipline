import { readEnv } from '@/lib/config/read';
import { validateEnv } from '@/lib/config/validate';
import { prisma } from '@/lib/db';
import { runMigrations } from '@/lib/db/migration';
import { log } from '@/lib/logger';
import { Tasks } from '@/lib/tasks';
import clearInvites from '@/lib/tasks/run/clearInvites';
import deleteFiles from '@/lib/tasks/run/deleteFiles';
import maxViews from '@/lib/tasks/run/maxViews';
import metrics from '@/lib/tasks/run/metrics';
import thumbnails from '@/lib/tasks/run/thumbnails';
import { fastifyCookie } from '@fastify/cookie';
import { fastifyCors } from '@fastify/cors';
import { fastifyMultipart } from '@fastify/multipart';
import { fastifyRateLimit } from '@fastify/rate-limit';
import { fastifySensible } from '@fastify/sensible';
import fastify from 'fastify';
import { mkdir } from 'fs/promises';
import { parse } from 'url';
import { version } from '../../package.json';
import { checkRateLimit } from './plugins/checkRateLimit';
import next, { ALL_METHODS } from './plugins/next';
import loadRoutes from './routes';
import { filesRoute } from './routes/files.dy';
import { urlsRoute } from './routes/urls.dy';
import { isAdministrator } from '@/lib/role';
import { notNull } from '@/lib/primitive';

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

  const server = fastify({
    ignoreTrailingSlash: true,
    https: notNull(config.ssl.key, config.ssl.cert)
      ? {
          key: config.ssl.key!,
          cert: config.ssl.cert!,
        }
      : null,
  });

  await server.register(fastifyCookie, {
    secret: config.core.secret,
    hook: 'onRequest',
  });

  await server.register(fastifyCors);

  await server.register(fastifySensible);

  await server.register(fastifyMultipart, {
    limits: {
      fileSize: config.files.maxFileSize,
    },
  });

  if (config.ratelimit.enabled) {
    try {
      checkRateLimit(config);

      await server.register(fastifyRateLimit, {
        global: false,
        hook: 'preHandler',
        max: config.ratelimit.max,
        timeWindow: config.ratelimit.window ?? undefined,
        keyGenerator: (req) => {
          return req.user?.id;
        },
        allowList: async (req, key) => {
          if (config.ratelimit.adminBypass && isAdministrator(req.user?.role)) return true;
          if (config.ratelimit.allowList.includes(key)) return true;
          if (Object.keys(req.headers).includes('x-zipline-p-filename')) return true;

          return false;
        },
      });
    } catch (e) {
      if (process.env.DEBUG) console.error(e);

      logger
        .c('ratelimit')
        .error((<Error>e).message)
        .error('skipping ratelimit setup due to error above');
    }
  }

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

  const tasks = new Tasks();
  tasks.interval('deletefiles', config.tasks.deleteInterval, deleteFiles(prisma));
  tasks.interval('maxviews', config.tasks.maxViewsInterval, maxViews(prisma));

  if (config.features.metrics) tasks.interval('metrics', config.tasks.metricsInterval, metrics(prisma));

  if (config.features.thumbnails.enabled) {
    for (let i = 0; i !== config.features.thumbnails.num_threads; ++i) {
      tasks.worker(`thumbnail-${i}`, './build/offload/thumbnails.js', {
        id: `thumbnail-${i}`,
        enabled: config.features.thumbnails.enabled,
      });
    }

    tasks.interval('thumbnails', config.tasks.thumbnailsInterval, thumbnails(prisma));
    tasks.interval('clearinvites', config.tasks.clearInvitesInterval, clearInvites(prisma));
  }

  tasks.start();
}

main();
