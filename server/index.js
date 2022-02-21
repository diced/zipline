const next = require('next').default;
const defaultConfig = require('next/dist/server/config-shared').defaultConfig;
const { createServer } = require('http');
const { stat, mkdir } = require('fs/promises');
const { extname } = require('path');
const validateConfig = require('./validateConfig');
const Logger = require('../src/lib/logger');
const readConfig = require('../src/lib/readConfig');
const mimes = require('../scripts/mimes');
const { log, getStats, shouldUseYarn, getFile, migrations } = require('./util');
const { PrismaClient } = require('@prisma/client');
const { version } = require('../package.json');
const nextConfig = require('../next.config');
const serverLog = Logger.get('server');
const webLog = Logger.get('web');

serverLog.info(`starting zipline@${version} server`);

const dev = process.env.NODE_ENV === 'development';

(async () => {
  try {
    await run();
  } catch (e) {
    serverLog.error(e);
    process.exit(1);
  }
})();

async function run() {
  const a = readConfig();
  const config = validateConfig(a);

  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  await mkdir(config.uploader.directory, { recursive: true });

  const app = next({
    dir: '.',
    dev,
    quiet: !dev,
    hostname: config.core.host,
    port: config.core.port,
    conf: Object.assign(defaultConfig, nextConfig),
  });

  await app.prepare();

  const handle = app.getRequestHandler();
  const prisma = new PrismaClient();
  
  const srv = createServer(async (req, res) => {
    const parts = req.url.split('/');
    if (!parts[2] || parts[2] === '') return;
    
    if (req.url.startsWith('/r')) {
      let image = await prisma.image.findFirst({
        where: {
          OR: [
            { file: parts[2] },
            { invisible: { invis: decodeURI(parts[2]) } },
          ],
        },
        select: {
          mimetype: true,
          id: true,
          file: true,
          invisible: true,
        },
      });

      image && await prisma.image.update({
        where: { id: image.id },
        data: { views: { increment: 1 } },
      });

      const data = await getFile(config.uploader.directory, parts[2]);
      if (!data) return app.render404(req, res);

      if (!image) { // raw image
        const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
        res.setHeader('Content-Type', mimetype);
        res.end(data);
      } else { // raw image & update db
        await prisma.image.update({
          where: { id: image.id },
          data: { views: { increment: 1 } },
        });
        res.setHeader('Content-Type', image.mimetype);
        res.end(data);
      }
    } else if (req.url.startsWith(config.uploader.route)) {
      let image = await prisma.image.findFirst({
        where: {
          OR: [
            { file: parts[2] },
            { invisible: { invis: decodeURI(parts[2]) } },
          ],
        },
        select: {
          mimetype: true,
          id: true,
          file: true,
          invisible: true,
          embed: true,
        },
      });

      image && await prisma.image.update({
        where: { id: image.id },
        data: { views: { increment: 1 } },
      });

      if (!image) { // raw image
        const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
        res.setHeader('Content-Type', mimetype);
        res.end(data);
      } else if (image.embed) { // embed image
        handle(req, res);
      } else { // raw image fallback
        res.setHeader('Content-Type', image.mimetype);
        res.end(data);
      }
    } else {
      handle(req, res);
    }

    if (config.core.logger) log(req.url, res.statusCode);
  });

  srv.on('error', (e) => {
    serverLog.error(e);

    process.exit(1);
  });
  srv.on('listening', () => {
    serverLog.info(`listening on ${config.core.host}:${config.core.port}`);
  });

  srv.listen(config.core.port, config.core.host ?? '0.0.0.0');

  const stats = await getStats(prisma, config);
  await prisma.stats.create({
    data: {
      data: stats,
    },
  });
  setInterval(async () => {
    const stats = await getStats(prisma, config);
    await prisma.stats.create({
      data: {
        data: stats,
      },
    });
    if (config.core.logger) serverLog.info('stats updated');
  }, config.core.stats_interval * 1000);
}