import config from 'lib/config';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import { getStats } from 'server/util';
import { version } from '../../package.json';

import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { createReadStream, existsSync, readFileSync } from 'fs';
import { Worker } from 'worker_threads';
import dbFileDecorator from './decorators/dbFile';
import notFound from './decorators/notFound';
import postFileDecorator from './decorators/postFile';
import postUrlDecorator from './decorators/postUrl';
import preFileDecorator from './decorators/preFile';
import rawFileDecorator from './decorators/rawFile';
import allPlugin from './plugins/all';
import configPlugin from './plugins/config';
import datasourcePlugin from './plugins/datasource';
import loggerPlugin from './plugins/logger';
import nextPlugin from './plugins/next';
import prismaPlugin from './plugins/prisma';
import rawRoute from './routes/raw';
import uploadsRoute, { uploadsRouteOnResponse } from './routes/uploads';
import urlsRoute, { urlsRouteOnResponse } from './routes/urls';

const dev = process.env.NODE_ENV === 'development';
const logger = Logger.get('server');

const server = fastify(genFastifyOpts());

if (dev) {
  server.addHook('onRoute', (opts) => {
    logger.child('route').debug(JSON.stringify(opts));
  });
}

start();

async function start() {
  logger.debug('Starting server');

  // plugins
  server
    .register(loggerPlugin)
    .register(configPlugin, config)
    .register(datasourcePlugin, datasource)
    .register(prismaPlugin)
    .register(nextPlugin, {
      dir: '.',
      dev,
      quiet: !dev,
      hostname: config.core.host,
      port: config.core.port,
    })
    .register(allPlugin);

  // decorators
  server
    .register(notFound)
    .register(postUrlDecorator)
    .register(postFileDecorator)
    .register(preFileDecorator)
    .register(rawFileDecorator)
    .register(dbFileDecorator);

  server.addHook('onRequest', (req, reply, done) => {
    if (config.features.headless) {
      const url = req.url.toLowerCase();
      if (!url.startsWith('/api') || url === '/api') return reply.notFound();
    }
    reply
      .header('Access-Control-Allow-Origin', '*')
      .header('Access-Control-Max-Age', '86400')
      .header('Access-Control-Allow-Headers', '*');

    done();
  });

  server.addHook('onResponse', (req, reply, done) => {
    if (config.core.logger) {
      if (req.url.startsWith('/_next')) return done();

      server.logger.child('response').info(`${req.method} ${req.url} -> ${reply.statusCode}`);
      server.logger.child('response').debug(
        JSON.stringify({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.headers['content-type']?.startsWith('application/json') ? req.body : undefined,
        })
      );
    }

    done();
  });

  server.get('/favicon.ico', async (_, reply) => {
    if (!existsSync('./public/favicon.ico')) return reply.notFound();

    const favicon = createReadStream('./public/favicon.ico');
    return reply.type('image/x-icon').send(favicon);
  });

  if (config.features.robots_txt) {
    server.get('/robots.txt', async (_, reply) => {
      return reply.type('text/plain').send(`User-Agent: *
Disallow: /r/
Disallow: /api/
Disallow: /view/
Disallow: ${config.uploader.route}
Disallow: ${config.urls.route}
`);
    });
  }

  // makes sure to handle both in one route as you cant have two handlers with the same route
  if (config.urls.route === '/' && config.uploader.route === '/') {
    server.route({
      method: 'GET',
      url: '/:id',
      handler: async (req, reply) => {
        const { id } = req.params as { id: string };
        if (id === '') return reply.notFound();
        else if (id === 'dashboard' && !config.features.headless)
          return server.nextServer.render(req.raw, reply.raw, '/dashboard');

        const url = await server.prisma.url.findFirst({
          where: {
            OR: [{ id: id }, { vanity: id }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
          },
        });

        if (url) return urlsRoute.bind(server)(req, reply);
        else return uploadsRoute.bind(server)(req, reply);
      },
      onResponse: async (req, reply, done) => {
        if (reply.statusCode === 200) {
          const { id } = req.params as { id: string };

          const url = await server.prisma.url.findFirst({
            where: {
              OR: [{ id: id }, { vanity: id }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
            },
          });

          if (url) urlsRouteOnResponse.bind(server)(req, reply, done);
          else uploadsRouteOnResponse.bind(server)(req, reply, done);
        }

        done();
      },
    });
  } else {
    server
      .route({
        method: 'GET',
        url: config.urls.route === '/' ? '/:id' : `${config.urls.route}/:id`,
        handler: urlsRoute.bind(server),
        onResponse: urlsRouteOnResponse.bind(server),
      })
      .route({
        method: 'GET',
        url: config.uploader.route === '/' ? '/:id' : `${config.uploader.route}/:id`,
        handler: uploadsRoute.bind(server),
        onResponse: uploadsRouteOnResponse.bind(server),
      });
  }

  server.get('/r/:id', rawRoute.bind(server));
  server.get('/', (_, reply) => reply.redirect('/dashboard'));

  await server.listen({
    port: config.core.port,
    host: config.core.host ?? '0.0.0.0',
  });

  server.logger
    .info(`listening on ${config.core.host}:${config.core.port}`)
    .info(
      `started ${dev ? 'development' : 'production'} zipline@${version} server${
        config.features.headless ? ' (headless)' : ''
      }`
    );

  await clearInvites.bind(server)();
  await stats.bind(server)();
  if (config.features.thumbnails) await thumbs.bind(server)();

  setInterval(() => clearInvites.bind(server)(), config.core.invites_interval * 1000);
  setInterval(() => stats.bind(server)(), config.core.stats_interval * 1000);
  if (config.features.thumbnails)
    setInterval(() => thumbs.bind(server)(), config.core.thumbnails_interval * 1000);
}

async function stats(this: FastifyInstance) {
  const stats = await getStats(server.prisma, server.datasource, server.logger);

  await this.prisma.stats.create({
    data: {
      data: stats,
    },
  });

  this.logger.child('stats').debug(`stats updated ${JSON.stringify(stats)}`);
}

async function clearInvites(this: FastifyInstance) {
  const { count } = await this.prisma.invite.deleteMany({
    where: {
      OR: [
        {
          expiresAt: { lt: new Date() },
        },
        {
          used: true,
        },
      ],
    },
  });

  logger.child('invites').debug(`deleted ${count} used invites`);
}

async function thumbs(this: FastifyInstance) {
  const videoFiles = await this.prisma.file.findMany({
    where: {
      mimetype: {
        startsWith: 'video/',
      },
      thumbnail: null,
    },
    include: {
      thumbnail: true,
    },
  });

  // avoids reaching prisma connection limit
  const MAX_THUMB_THREADS = 4;

  // make all the files fit into 4 arrays
  const chunks = [];

  for (let i = 0; i !== MAX_THUMB_THREADS; ++i) {
    chunks.push([]);

    for (let j = i; j < videoFiles.length; j += MAX_THUMB_THREADS) {
      chunks[i].push(videoFiles[j]);
    }
  }

  logger.child('thumbnail').debug(`starting ${chunks.length} thumbnail threads`);

  for (let i = 0; i !== chunks.length; ++i) {
    const chunk = chunks[i];
    if (chunk.length === 0) continue;

    logger.child('thumbnail').debug(`starting thumbnail generation for ${chunk.length} videos`);

    new Worker('./dist/worker/thumbnail.js', {
      workerData: {
        videos: chunk,
      },
    }).on('error', (err) => logger.child('thumbnail').error(err));
  }
}

function genFastifyOpts(): FastifyServerOptions {
  const opts = {};

  if (config.ssl?.cert && config.ssl?.key) {
    opts['https'] = {
      key: readFileSync(config.ssl.key),
      cert: readFileSync(config.ssl.cert),
    };

    if (config.ssl?.allow_http1) opts['https']['allowHTTP1'] = true;
  }

  return opts;
}
