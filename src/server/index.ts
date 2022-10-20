import Router from 'find-my-way';
import next from 'next';
import { NextServer, RequestHandler } from 'next/dist/server/next';
import { Image, PrismaClient } from '@prisma/client';
import { createServer, IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import { extname } from 'path';
import { mkdir } from 'fs/promises';
import { getStats, log, migrations } from './util';
import Logger from 'lib/logger';
import { guess } from 'lib/mimes';
import exts from 'lib/exts';
import { version } from '../../package.json';
import config from 'lib/config';
import datasource from 'lib/datasource';

const dev = process.env.NODE_ENV === 'development';

const logger = Logger.get('server');

start();

async function start() {
  // annoy user if they didnt change secret from default "changethis"
  if (config.core.secret === 'changethis') {
    logger.error('Secret is not set!');
    logger.error(
      'Running Zipline as is, without a randomized secret is not recommended and leaves your instance at risk!'
    );
    logger.error('Please change your secret in the config file or environment variables.');
    logger.error(
      'The config file is located at `config.toml`, or if using docker-compose you can change the variables in the `docker-compose.yml` file.'
    );
    logger.error('It is recomended to use a secret that is alphanumeric and randomized.');
    logger.error('A way you can generate this is through a password manager you may have.');
    process.exit(1);
  }

  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local.directory, { recursive: true });
  }

  const nextServer = next({
    dir: '.',
    dev,
    quiet: !dev,
    hostname: config.core.host,
    port: config.core.port,
  });

  const handle = nextServer.getRequestHandler();
  const router = Router({
    defaultRoute: (req, res) => {
      handle(req, res);
    },
  });

  router.on(
    'GET',
    config.uploader.route === '/' ? '/:id(^[^\\.]+\\.[^\\.]+)' : `${config.uploader.route}/:id`,
    async (req, res, params) => {
      if (params.id === '') return nextServer.render404(req, res as ServerResponse);

      const image = await prisma.image.findFirst({
        where: {
          OR: [{ file: params.id }, { invisible: { invis: decodeURI(params.id) } }],
        },
      });

      if (!image) await rawFile(req, res, nextServer, params.id);
      else {
        if (image.password) await handle(req, res);
        else if (image.embed) await handle(req, res);
        else await fileDb(req, res, nextServer, prisma, handle, image);
      }
    }
  );

  router.on('GET', '/r/:id', async (req, res, params) => {
    if (params.id === '') return nextServer.render404(req, res as ServerResponse);

    const image = await prisma.image.findFirst({
      where: {
        OR: [{ file: params.id }, { invisible: { invis: decodeURI(params.id) } }],
      },
    });

    if (!image) await rawFile(req, res, nextServer, params.id);
    else {
      if (image.password) await handle(req, res);
      else await rawFileDb(req, res, nextServer, prisma, image);
    }
  });

  await nextServer.prepare();

  const http = createServer((req, res) => {
    router.lookup(req, res);
    if (config.core.logger) log(req.url);
  });

  http.on('error', (e) => {
    logger.error(e);
    process.exit(1);
  });

  http.on('listening', () => {
    logger.info(`listening on ${config.core.host}:${config.core.port}`);
  });

  http.listen(config.core.port, config.core.host ?? '0.0.0.0');

  logger.info(`started ${dev ? 'development' : 'production'} zipline@${version} server`);

  stats(prisma);

  setInterval(async () => {
    await prisma.invite.deleteMany({
      where: {
        used: true,
      },
    });

    if (config.core.logger) logger.info('invites cleaned');
  }, config.core.invites_interval * 1000);
}

async function rawFile(req: IncomingMessage, res: OutgoingMessage, nextServer: NextServer, id: string) {
  const data = await datasource.get(id);
  if (!data) return nextServer.render404(req, res as ServerResponse);
  const mimetype = await guess(extname(id));
  const size = await datasource.size(id);

  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Length', size);

  data.pipe(res);
  data.on('error', () => nextServer.render404(req, res as ServerResponse));
  data.on('end', () => res.end());
}

async function rawFileDb(
  req: IncomingMessage,
  res: OutgoingMessage,
  nextServer: NextServer,
  prisma: PrismaClient,
  image: Image
) {
  if (image.expires_at && image.expires_at < new Date()) {
    Logger.get('server').info(`${image.file} expired`);
    await datasource.delete(image.file);
    await prisma.image.delete({ where: { id: image.id } });

    return nextServer.render404(req, res as ServerResponse);
  }

  const data = await datasource.get(image.file);
  if (!data) return nextServer.render404(req, res as ServerResponse);

  const size = await datasource.size(image.file);

  res.setHeader('Content-Type', image.mimetype);
  res.setHeader('Content-Length', size);

  data.pipe(res);
  data.on('error', () => nextServer.render404(req, res as ServerResponse));
  data.on('end', () => res.end());

  await prisma.image.update({
    where: { id: image.id },
    data: { views: { increment: 1 } },
  });
}

async function fileDb(
  req: IncomingMessage,
  res: OutgoingMessage,
  nextServer: NextServer,
  prisma: PrismaClient,
  handle: RequestHandler,
  image: Image
) {
  if (image.expires_at && image.expires_at < new Date()) {
    await datasource.delete(image.file);
    await prisma.image.delete({ where: { id: image.id } });

    return nextServer.render404(req, res as ServerResponse);
  }

  const ext = image.file.split('.').pop();
  if (Object.keys(exts).includes(ext)) return handle(req, res as ServerResponse);

  const data = await datasource.get(image.file);
  if (!data) return nextServer.render404(req, res as ServerResponse);

  const size = await datasource.size(image.file);

  res.setHeader('Content-Type', image.mimetype);
  res.setHeader('Content-Length', size);
  data.pipe(res);
  data.on('error', () => nextServer.render404(req, res as ServerResponse));
  data.on('end', () => res.end());

  await prisma.image.update({
    where: { id: image.id },
    data: { views: { increment: 1 } },
  });
}

async function stats(prisma: PrismaClient) {
  const stats = await getStats(prisma, datasource);
  await prisma.stats.create({
    data: {
      data: stats,
    },
  });

  setInterval(async () => {
    const stats = await getStats(prisma, datasource);
    await prisma.stats.create({
      data: {
        data: stats,
      },
    });
    if (config.core.logger) logger.info('stats updated');
  }, config.core.stats_interval * 1000);
}
