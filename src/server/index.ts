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
import deleteJob from '@/lib/scheduler/jobs/delete';
import maxViewsJob from '@/lib/scheduler/jobs/maxViews';
import { handleOverrideColors, parseThemes, readThemesDir } from '@/lib/theme/file';

const MODE = process.env.NODE_ENV || 'production';

const logger = log('server');
const scheduler = new Scheduler();

async function main() {
  logger.info('starting zipline', { mode: MODE, version: version });

  const server = express();

  const themes = await readThemesDir();
  console.log('themes', themes)
  const parsedThemes = await parseThemes(themes);
  console.log('parsedThemes', parsedThemes)
  const overriden = await handleOverrideColors(parsedThemes[0]);
  console.log('overriden', overriden)

  logger.info('reading environment for configuration');
  const config = validateEnv(readEnv());

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local!.directory, { recursive: true });
  }

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
    server.get(config.files.route === '/' ? `/:id` : `${config.files.route}/:id`, async (req, res) => {
      filesRoute.bind(server)(app, req, res);
    });

    server.get(config.urls.route === '/' ? `/:id` : `${config.urls.route}/:id`, async (req, res) => {
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

    if (!file) return app.render404(req, res, parsedUrl);

    const stream = await datasource.get(file.name);
    if (!stream) return app.render404(req, res, parsedUrl);
    if (file.password) {
      if (!pw) return res.status(403).json({ code: 403, message: 'Password protected.' });
      const verified = await verifyPassword(pw as string, file.password!);

      if (!verified) return res.status(403).json({ code: 403, message: 'Incorrect password.' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', file.size);
    file.originalName &&
      res.setHeader(
        'Content-Disposition',
        `${req.query.download ? 'attachment; ' : ''}filename="${file.originalName}"`
      );

    stream.pipe(res);
  });

  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  server.listen(config.core.port, config.core.hostname, () => {
    logger.info(`server listening`, {
      hostname: config.core.hostname,
      port: config.core.port,
    });

    scheduler.addInterval('delete', config.scheduler.deleteInterval, deleteJob(prisma));
    scheduler.addInterval('maxviews', config.scheduler.maxViewsInterval, maxViewsJob(prisma));

    scheduler.start();
  });
}

main();
