import { Image, PrismaClient, Url } from '@prisma/client';
import Router from 'find-my-way';
import { createReadStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { createServer, IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import next from 'next';
import { NextServer, RequestHandler } from 'next/dist/server/next';
import { extname } from 'path';
import { version } from '../../package.json';
import config from '../lib/config';
import datasource from '../lib/datasource';
import exts from '../lib/exts';
import Logger from '../lib/logger';
import { guess } from '../lib/mimes';
import { getStats, log, migrations, redirect } from './util';

const dev = process.env.NODE_ENV === 'development';
const logger = Logger.get('server');

start();

async function start() {
  logger.debug('Starting server');

  // annoy user if they didnt change secret from default "changethis"
  if (config.core.secret === 'changethis') {
    logger
      .error('Secret is not set!')
      .error(
        'Running Zipline as is, without a randomized secret is not recommended and leaves your instance at risk!'
      )
      .error('Please change your secret in the config file or environment variables.')
      .error(
        'The config file is located at `.env.local`, or if using docker-compose you can change the variables in the `docker-compose.yml` file.'
      )
      .error('It is recomended to use a secret that is alphanumeric and randomized.')
      .error('A way you can generate this is through a password manager you may have.');

    process.exit(1);
  }

  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();

  const admin = await prisma.user.findFirst({
    where: {
      id: 1,
      OR: {
        username: 'administrator',
      },
    },
  });

  if (admin) {
    logger.debug('setting main administrator user to a superAdmin');

    await prisma.user.update({
      where: {
        id: admin.id,
      },
      data: {
        superAdmin: true,
      },
    });
  }

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
      if (config.features.headless) {
        const url = req.url.toLowerCase();
        if (!url.startsWith('/api') || url === '/api') return notFound(req, res, nextServer);
      }

      handle(req, res);
    },
  });

  router.on('GET', '/favicon.ico', async (req, res) => {
    if (!existsSync('./public/favicon.ico')) return notFound(req, res, nextServer);

    const favicon = createReadStream('./public/favicon.ico');
    res.setHeader('Content-Type', 'image/x-icon');

    favicon.pipe(res);
  });

  const urlsRoute = async (req, res, params) => {
    if (params.id === '') return notFound(req, res, nextServer);
    else if (params.id === 'dashboard' && !config.features.headless)
      return nextServer.render(req, res as ServerResponse, '/dashboard');

    const url = await prisma.url.findFirst({
      where: {
        OR: [{ id: params.id }, { vanity: params.id }, { invisible: { invis: decodeURI(params.id) } }],
      },
    });
    if (!url) return notFound(req, res, nextServer);

    redirect(res, url.destination);

    postUrl(url, prisma);
  };

  const uploadsRoute = async (req, res, params) => {
    if (params.id === '') return notFound(req, res, nextServer);
    else if (params.id === 'dashboard' && !config.features.headless)
      return nextServer.render(req, res as ServerResponse, '/dashboard');

    const image = await prisma.image.findFirst({
      where: {
        OR: [{ file: params.id }, { invisible: { invis: decodeURI(params.id) } }],
      },
    });

    if (!image) return rawFile(req, res, nextServer, params.id);
    else {
      const failed = await preFile(image, prisma);
      if (failed) return notFound(req, res, nextServer);

      if (image.password || image.embed || image.mimetype.startsWith('text/'))
        redirect(res, `/view/${image.file}`);
      else fileDb(req, res, nextServer, handle, image);

      postFile(image, prisma);
    }
  };

  // makes sure to handle both in one route as you cant have two handlers with the same route
  if (config.urls.route === '/' && config.uploader.route === '/') {
    router.on('GET', '/:id', async (req, res, params) => {
      if (params.id === '') return notFound(req, res, nextServer);
      else if (params.id === 'dashboard' && !config.features.headless)
        return nextServer.render(req, res as ServerResponse, '/dashboard');

      const url = await prisma.url.findFirst({
        where: {
          OR: [{ id: params.id }, { vanity: params.id }, { invisible: { invis: decodeURI(params.id) } }],
        },
      });

      if (url) return urlsRoute(req, res, params);
      else return uploadsRoute(req, res, params);
    });
  } else {
    router.on('GET', config.urls.route === '/' ? '/:id' : `${config.urls.route}/:id`, urlsRoute);

    router.on('GET', config.uploader.route === '/' ? '/:id' : `${config.uploader.route}/:id`, uploadsRoute);
  }

  router.on('GET', '/r/:id', async (req, res, params) => {
    if (params.id === '') return notFound(req, res, nextServer);

    const image = await prisma.image.findFirst({
      where: {
        OR: [{ file: params.id }, { invisible: { invis: decodeURI(params.id) } }],
      },
    });

    if (!image) await rawFile(req, res, nextServer, params.id);
    else {
      const failed = await preFile(image, prisma);
      if (failed) return notFound(req, res, nextServer);

      if (image.password) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 403;
        return res.end(
          JSON.stringify({
            error: "can't view a raw file that has a password",
            url: `/view/${image.file}`,
            code: 403,
          })
        );
      } else await rawFile(req, res, nextServer, params.id);
    }
  });

  try {
    await nextServer.prepare();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }

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

  logger.info(
    `started ${dev ? 'development' : 'production'} zipline@${version} server${
      config.features.headless ? ' (headless)' : ''
    }`
  );

  stats(prisma);
  clearInvites(prisma);

  setInterval(() => clearInvites(prisma), config.core.invites_interval * 1000);
  setInterval(() => stats(prisma), config.core.stats_interval * 1000);
}

async function notFound(req: IncomingMessage, res: ServerResponse, nextServer: NextServer) {
  if (config.features.headless) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'not found', url: req.url, code: 404 }));
  } else {
    return nextServer.render404(req, res);
  }
}

async function preFile(file: Image, prisma: PrismaClient) {
  if (file.expires_at && file.expires_at < new Date()) {
    await datasource.delete(file.file);
    await prisma.image.delete({ where: { id: file.id } });

    Logger.get('file').info(`File ${file.file} expired and was deleted.`);

    return true;
  }

  return false;
}

async function postFile(file: Image, prisma: PrismaClient) {
  const nFile = await prisma.image.update({
    where: { id: file.id },
    data: { views: { increment: 1 } },
  });

  if (nFile.maxViews && nFile.views >= nFile.maxViews) {
    await datasource.delete(file.file);
    await prisma.image.delete({ where: { id: nFile.id } });

    Logger.get('file').info(`File ${file.file} has been deleted due to max views (${nFile.maxViews})`);

    return true;
  }
}

async function postUrl(url: Url, prisma: PrismaClient) {
  const nUrl = await prisma.url.update({
    where: {
      id: url.id,
    },
    data: {
      views: { increment: 1 },
    },
  });

  if (nUrl.maxViews && nUrl.views >= nUrl.maxViews) {
    await prisma.url.delete({
      where: {
        id: nUrl.id,
      },
    });

    Logger.get('url').debug(`url deleted due to max views ${JSON.stringify(nUrl)}`);
  }
}

async function rawFile(req: IncomingMessage, res: OutgoingMessage, nextServer: NextServer, id: string) {
  const data = await datasource.get(id);
  if (!data) return notFound(req, res as ServerResponse, nextServer);

  const mimetype = await guess(extname(id));
  const size = await datasource.size(id);

  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Length', size);

  data.pipe(res);
  data.on('error', (e) => {
    logger.debug(`error while serving raw file ${id}: ${e}`);
    notFound(req, res as ServerResponse, nextServer);
  });
  data.on('end', () => res.end());
}

async function fileDb(
  req: IncomingMessage,
  res: OutgoingMessage,
  nextServer: NextServer,
  handle: RequestHandler,
  image: Image
) {
  const ext = image.file.split('.').pop();
  if (Object.keys(exts).includes(ext)) return handle(req, res as ServerResponse);

  const data = await datasource.get(image.file);
  if (!data) return notFound(req, res as ServerResponse, nextServer);

  const size = await datasource.size(image.file);

  res.setHeader('Content-Type', image.mimetype);
  res.setHeader('Content-Length', size);

  data.pipe(res);
  data.on('error', (e) => {
    logger.debug(`error while serving raw file ${image.file}: ${e}`);
    notFound(req, res as ServerResponse, nextServer);
  });
  data.on('end', () => res.end());
}

async function stats(prisma: PrismaClient) {
  const stats = await getStats(prisma, datasource);
  await prisma.stats.create({
    data: {
      data: stats,
    },
  });

  logger.debug(`stats updated ${JSON.stringify(stats)}`);
}

async function clearInvites(prisma: PrismaClient) {
  const { count } = await prisma.invite.deleteMany({
    where: {
      OR: [
        {
          expires_at: { lt: new Date() },
        },
        {
          used: true,
        },
      ],
    },
  });

  logger.debug(`deleted ${count} used invites`);
}
