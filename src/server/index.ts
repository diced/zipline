import { readEnv } from '@/lib/config/read';
import { validateEnv } from '@/lib/config/validate';
import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { runMigrations } from '@/lib/db/migration';
import { log } from '@/lib/logger';
import express from 'express';
import { mkdir } from 'fs/promises';
import next from 'next';
import { parse } from 'url';

import { version } from '../../package.json';
import { filesRoute } from './routes/files';
import { urlsRoute } from './routes/urls';
import { Scheduler } from '@/lib/scheduler';
import deleteFiles from '@/lib/scheduler/jobs/deleteFiles';
import clearInvites from '@/lib/scheduler/jobs/clearInvites';
import maxViews from '@/lib/scheduler/jobs/maxViews';
import thumbnails from '@/lib/scheduler/jobs/thumbnails';
import metrics from '@/lib/scheduler/jobs/metrics';
import { parseRange } from '@/lib/api/range';

const MODE = process.env.NODE_ENV || 'production';

const logger = log('server');
const scheduler = new Scheduler();

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

  const server = express();

  logger.info('reading environment for configuration');
  const config = validateEnv(readEnv());

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local!.directory, { recursive: true });
  }

  await mkdir(config.core.tempDirectory, { recursive: true });

  process.env.DATABASE_URL = config.core.databaseUrl;

  await runMigrations();

  server.disable('x-powered-by');
  server.use(express.static('public', { maxAge: '1h' }));

  const app = next({
    dev: MODE === 'development',
    quiet: MODE === 'production',
    hostname: config.core.hostname,
    port: config.core.port,
    dir: '.',
  });
  const handle = app.getRequestHandler();

  await app.prepare();

  if (config.files.route === '/' && config.urls.route === '/') {
    logger.debug('files & urls route are both /, using catch-all route');

    server.get('/:id', async (req, res) => {
      const { id } = req.params;
      const parsedUrl = parse(req.url!, true);

      if (id === '') return app.render404(req, res, parsedUrl);
      else if (id === 'dashboard') return app.render(req, res, '/dashboard');

      const url = await prisma.url.findFirst({
        where: {
          OR: [{ code: id }, { vanity: id }],
        },
      });

      if (url) return urlsRoute.bind(server)(app, req, res);
      else return filesRoute.bind(server)(app, req, res);
    });
  } else {
    server.get(config.files.route === '/' ? '/:id' : `${config.files.route}/:id`, async (req, res) => {
      filesRoute.bind(server)(app, req, res);
    });

    server.get(config.urls.route === '/' ? '/:id' : `${config.urls.route}/:id`, async (req, res) => {
      urlsRoute.bind(server)(app, req, res);
    });
  }

  server.get('/raw/:id', async (req, res) => {
    const { id } = req.params;
    const { pw } = req.query;

    const parsedUrl = parse(req.url!, true);

    const file = await prisma.file.findFirst({
      where: {
        name: id,
      },
    });

    if (file?.password) {
      if (!pw) return res.status(403).json({ code: 403, message: 'Password protected.' });
      const verified = await verifyPassword(pw as string, file.password!);

      if (!verified) return res.status(403).json({ code: 403, message: 'Incorrect password.' });
    }

    const size = file?.size || (await datasource.size(file?.name ?? id));

    if (req.headers.range) {
      const [start, end] = parseRange(req.headers.range, size);
      if (start >= size || end >= size) {
        res.writeHead(416, {
          'Content-Length': size,
          'Content-Type': file?.type || 'application/octet-stream',
          ...(file?.originalName && {
            'Content-Disposition': `${req.query.download ? 'attachment; ' : ''}filename="${
              file.originalName
            }"`,
          }),
        });

        const buf = await datasource.get(file?.name ?? id);
        if (!buf) return app.render404(req, res, parsedUrl);

        return buf.pipe(res);
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': file?.type || 'application/octet-stream',
        ...(file?.originalName && {
          'Content-Disposition': `${req.query.download ? 'attachment; ' : ''}filename="${file.originalName}"`,
        }),
      });

      const buf = await datasource.range(file?.name ?? id, start || 0, end);
      if (!buf) return app.render404(req, res, parsedUrl);

      return buf.pipe(res);
    }

    res.writeHead(200, {
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
      'Content-Type': file?.type || 'application/octet-stream',
      ...(file?.originalName && {
        'Content-Disposition': `${req.query.download ? 'attachment; ' : ''}filename="${file.originalName}"`,
      }),
    });

    const buf = await datasource.get(file?.name ?? id);
    if (!buf) return app.render404(req, res, parsedUrl);

    return buf.pipe(res);
  });

  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  server.listen(config.core.port, config.core.hostname, () => {
    logger.info('server listening', {
      hostname: config.core.hostname,
      port: config.core.port,
    });

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

    scheduler.start();
  });
}

main();
