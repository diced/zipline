import next from 'next';
import { createServer } from 'http';
import { extname } from 'path';
import Logger from '../lib/logger';
import mimes from '../../scripts/mimes';
import { log, getStats, migrations } from './util';
import { PrismaClient } from '@prisma/client';
import { version } from '../../package.json';
import exts from '../../scripts/exts';
import datasource from '../lib/ds';
import config from '../lib/config';
import { mkdir } from 'fs/promises';
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
  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local.directory, { recursive: true });
  }

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
        const data = await datasource.get(parts[2]);
        if (!data) return app.render404(req, res);

        const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
        res.setHeader('Content-Type', mimetype);
        res.end(data);
      } else {
        const data = await datasource.get(parts[2]);
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
        const data = await datasource.get(parts[2]);
        if (!data) return app.render404(req, res);

        const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
        res.setHeader('Content-Type', mimetype);
        res.end(data);
      } else if (image.embed) {
        handle(req, res);
      } else {
        const ext = image.file.split('.').pop();
        if (Object.keys(exts).includes(ext)) return handle(req, res);
        
        const data = await datasource.get(parts[2]);
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

    if (config.core.logger) log(req.url);
  });

  srv.on('error', (e) => {
    serverLog.error(e);

    process.exit(1);
  });

  srv.on('listening', () => {
    serverLog.info(`listening on ${config.core.host}:${config.core.port}`);
  });

  srv.listen(config.core.port, config.core.host ?? '0.0.0.0');

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
    if (config.core.logger) serverLog.info('stats updated');
  }, config.core.stats_interval * 1000);
}