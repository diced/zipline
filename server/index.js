const next = require('next').default;
const { createServer } = require('http');
const { mkdir } = require('fs/promises');
const { extname } = require('path');
const validateConfig = require('./validateConfig');
const Logger = require('../src/lib/logger');
const readConfig = require('../src/lib/readConfig');
const mimes = require('../scripts/mimes');
const { log, getStats, getFile, migrations } = require('./util');
const { PrismaClient } = require('@prisma/client');
const { version } = require('../package.json');
const exts = require('../scripts/exts');
const serverLog = Logger.get('server');

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
  });

  await app.prepare();

  const handle = app.getRequestHandler();
  const prisma = new PrismaClient();
  
  const srv = createServer(async (req, res) => {
    if (req.url.startsWith('/r')) {
      const parts = req.url.split('/');
      if (!parts[2] || parts[2] === '') return;

      let image = await prisma.image.findFirst({
        where: {
          OR: [
            { file: parts[2] },
            { invisible:{ invis: decodeURI(parts[2]) } },
          ],
        },
        select: {
          mimetype: true,
          id: true,
          file: true,
          invisible: true,
        },
      });

      if (!image) {
        const data = await getFile(config.uploader.directory, parts[2]);
        if (!data) return app.render404(req, res);

        const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
        res.setHeader('Content-Type', mimetype);
        res.end(data);
      } else {
        const data = await getFile(config.uploader.directory, image.file);
        if (!data) return app.render404(req, res);

        await prisma.image.update({
          where: { id: image.id },
          data: { views: { increment: 1 } },
        });
        res.setHeader('Content-Type', image.mimetype);
        res.end(data);
      }
    } else if (req.url.startsWith(config.uploader.route)) {
      const parts = req.url.split('/');
      if (!parts[2] || parts[2] === '') return;

      let image = await prisma.image.findFirst({
        where: {
          OR: [
            { file: parts[2] },
            { invisible:{ invis: decodeURI(parts[2]) } },
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

      if (!image) {
        const data = await getFile(config.uploader.directory, parts[2]);
        if (!data) return app.render404(req, res);

        const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
        res.setHeader('Content-Type', mimetype);
        res.end(data);
      } else if (image.embed) {
        handle(req, res);
      } else {
        const ext = image.file.split('.').pop();
        if (Object.keys(exts).includes(ext)) return handle(req, res);
        const data = await getFile(config.uploader.directory, image.file);
        if (!data) return app.render404(req, res);

        await prisma.image.update({
          where: { id: image.id },
          data: { views: { increment: 1 } },
        });
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