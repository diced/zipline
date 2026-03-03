import { bytes } from '@/lib/bytes';
import { reloadSettings } from '@/lib/config';
import { checkDbVars, REQUIRED_DB_VARS } from '@/lib/config/read/env';
import { getDatasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { runMigrations } from '@/lib/db/migration';
import { log } from '@/lib/logger';
import { isAdministrator } from '@/lib/role';
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
import { fastifyStatic } from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastify from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { appendFile, mkdir, writeFile } from 'fs/promises';
import ms, { StringValue } from 'ms';
import { version } from '../../package.json';
import { checkRateLimit } from './plugins/checkRateLimit';
import oauthPlugin from './plugins/oauth';
import vitePlugin from './plugins/vite';
import loadRoutes from './routes';
import { filesRoute } from './routes/files.dy';
import { urlsRoute } from './routes/urls.dy';
import cleanThumbnails from '@/lib/tasks/run/cleanThumbnails';
import { API_ERRORS, ApiError } from '@/lib/api/errors';

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
  const argv = process.argv.slice(2);
  logger.info('starting zipline', { mode: MODE, version: version, argv });

  if (!checkDbVars()) {
    logger.error(`either DATABASE_URL or all of [${REQUIRED_DB_VARS.join(', ')}] not set, exiting...`);
    process.exit(1);
  }

  await runMigrations();

  logger.info('reading settings...');
  await reloadSettings();

  const config = global.__config__;
  getDatasource(config);

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local!.directory, { recursive: true });
  }

  await mkdir(config.core.tempDirectory, { recursive: true });

  logger.debug('creating server', {
    port: config.core.port,
    hostname: config.core.hostname,
    trustProxy: config.core.trustProxy,
  });

  const server = fastify({
    trustProxy: config.core.trustProxy,
  }).withTypeProvider<ZodTypeProvider>();

  if (process.env.DEBUG_EVENT_EMITTER) {
    server.addHook('onSend', async (req, res) => {
      const counts = {
        listeners: res.raw.eventNames(),
        close: res.raw.listenerCount('close'),
        data: res.raw.listenerCount('data'),
        end: res.raw.listenerCount('end'),
        error: res.raw.listenerCount('error'),
      };

      logger.debug('event emitter counts', { path: req.url, ...counts });
    });
  }
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Zipline',
        description: 'Zipline API',
        version: version,
      },
      servers: [],
    },
    transform: jsonSchemaTransform,
  });

  await server.register(fastifyCookie, {
    secret: config.core.secret,
    hook: 'onRequest',
  });

  await server.register(fastifyCors);

  await server.register(fastifySensible);

  await server.register(fastifyMultipart, {
    limits: {
      fileSize: bytes(config.files.maxFileSize),
    },
  });

  await server.register(fastifyStatic, {
    serve: false,
    root: config.core.tempDirectory,
  });

  await server.register(vitePlugin);

  await server.register(oauthPlugin);

  if (config.ratelimit.enabled) {
    try {
      checkRateLimit(config);

      await server.register(fastifyRateLimit, {
        global: false,
        hook: 'preHandler',
        max: config.ratelimit.max,
        timeWindow: config.ratelimit.window ?? undefined,
        keyGenerator: (req) => {
          return `${req.user?.id ?? req.ip}-${req.url}-${req.method}`;
        },
        allowList: async (req, key) => {
          if (config.ratelimit.adminBypass && isAdministrator(req.user?.role)) return true;
          if (config.ratelimit.allowList.includes(key)) return true;
          if (Object.keys(req.headers).includes('x-zipline-p-filename')) return true;

          return false;
        },
        onExceeded(req, key) {
          logger
            .c('ratelimit')
            .warn(`rate limit exceeded for user ${req.user?.username ?? req.ip ?? 'unknown'}`, { key });
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

  server.get<{ Params: { id: string } }>('/r/:id', async (req, res) => {
    return res.redirect('/raw/' + req.params.id, 301);
  });

  server.get<{ Params: { id: string } }>('/view/:id', async (_req, res) => {
    return res.ssr('view');
  });

  server.get<{ Params: { id: string } }>('/view/url/:id', async (_req, res) => {
    return res.ssr('view-url');
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
  const routesOptions = Object.values(routes);
  Promise.all(routesOptions.map((route) => server.register(route)));

  if (MODE === 'production') {
    server.serveIndex('/dashboard*');
    server.serveIndex('/auth*');
    server.serveIndex('/folder*');
  }

  server.get('/', (_, res) => res.redirect('/dashboard', 301));

  server.setNotFoundHandler((req, res) => {
    if (MODE === 'development' && server.vite)
      return res.status(404).send({
        message: `Route ${req.method}:${req.url} not found`,
        error: 'Not Found',
        statusCode: 404,
        dev: true,
      });

    if (req.url.startsWith('/api/')) {
      return res.status(404).send({
        message: `Route ${req.method}:${req.url} not found`,
        error: 'Not Found',
        statusCode: 404,
      });
    } else {
      return res.serveIndex();
    }
  });

  server.setErrorHandler((error: any, _, res) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return res.status(400).send({
        error: error.message ?? '1000: Invalid response schema',
        statusCode: 400,
        code: API_ERRORS[1000],
        issues: error.validation,
      });
    }

    if (error instanceof ApiError) {
      const apiError = error as ApiError;
      return res.status(apiError.status).send(apiError.toJSON());
    }

    if (error.statusCode) {
      return res.status(error.statusCode).send({ error: error.message, statusCode: error.statusCode });
    } else {
      console.error(error);

      return res.status(500).send({ error: 'Internal Server Error', statusCode: 500 });
    }
  });

  const tasks = new Tasks();
  server.decorate('tasks', tasks);

  if (process.env.ZIPLINE_OUTPUT_OPENAPI === 'true') {
    server.ready(async (a) => {
      console.log(a);
      const openapi = server.swagger();
      await writeFile('./openapi.json', JSON.stringify(openapi, null, 2), 'utf8');

      logger.info('OpenAPI schema written to openapi.json');

      process.exit(0);
    });
  }

  await server.listen({
    port: config.core.port,
    host: config.core.hostname,
  });

  logger.info('server started', { hostname: config.core.hostname, port: config.core.port });

  // Tasks
  tasks.interval('deletefiles', ms(config.tasks.deleteInterval as StringValue), deleteFiles(prisma));
  tasks.interval('maxviews', ms(config.tasks.maxViewsInterval as StringValue), maxViews(prisma));
  tasks.interval('clearinvites', ms(config.tasks.clearInvitesInterval as StringValue), clearInvites(prisma));
  tasks.interval(
    'cleanthumbnails',
    ms(config.tasks.cleanThumbnailsInterval as StringValue),
    cleanThumbnails(prisma),
  );

  if (config.features.metrics)
    tasks.interval('metrics', ms(config.tasks.metricsInterval as StringValue), metrics(prisma));

  if (config.features.thumbnails.enabled) {
    tasks.interval('thumbnails', ms(config.tasks.thumbnailsInterval as StringValue), thumbnails(prisma));

    for (let i = 0; i !== config.features.thumbnails.num_threads; ++i) {
      tasks.worker(
        `thumbnail-${i}`,
        './build/offload/thumbnails.js',
        {
          id: `thumbnail-${i}`,
          enabled: config.features.thumbnails.enabled,
        },
        async function (this: Worker, message: any) {
          if (message.type === 'query') {
            const { id, query, data } = message;

            let result: any = null;
            switch (query) {
              case 'file.findUnique':
                result = await prisma.file.findUnique(data);
                break;
              case 'thumbnail.findFirst':
                result = await prisma.thumbnail.findFirst(data);
                break;
              case 'thumbnail.create':
                result = await prisma.thumbnail.create(data);
                break;
              case 'thumbnail.update':
                result = await prisma.thumbnail.update(data);
                break;
              default:
                console.error(`Unknown DB query: ${query}`);
            }

            this.postMessage({
              type: 'response',
              id,
              result: JSON.stringify(result),
            });
          }
        },
      );
    }
  }

  tasks.start();

  if (process.env.DEBUG_MONITOR_MEMORY === 'true') {
    await writeFile('.memory.log', '', 'utf8');
    setInterval(async () => {
      const mu = process.memoryUsage();
      const cpu = process.cpuUsage();

      const entry = `${Math.floor(Date.now() / 1000)},${mu.rss},${mu.heapUsed},${mu.heapTotal},${mu.external},${mu.arrayBuffers},${cpu.system},${cpu.user}\n`;

      await appendFile('.memory.log', entry, 'utf8');
    }, 1000);
  }
}

main();

declare module 'fastify' {
  interface FastifyInstance {
    tasks: Tasks;
  }
}

declare module 'node:http' {
  interface IncomingMessage {
    body?: any;
  }
}
