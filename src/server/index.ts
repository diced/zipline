import { validateEnv } from '@/lib/config/validate';
import { readEnv } from '@/lib/config/read';
import { runMigrations } from '@/lib/db/migration';
import { log } from '@/lib/logger';
import express from 'express';
import next from 'next';
import { parse } from 'url';
import { mkdir } from 'fs/promises';
import { prisma } from '@/lib/db';
import { datasource } from '@/lib/datasource';
import { guess } from '@/lib/mimes';
import { extname } from 'path';
import { verifyPassword } from '@/lib/crypto';

import { version } from '../../package.json';

const MODE = process.env.NODE_ENV || 'production';

const logger = log('server');

async function main() {
  logger.info('starting zipline', { mode: MODE, version: version });

  const server = express();

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

  server.get(config.files.route === '/' ? `/:id` : `${config.files.route}/:id`, async (req, res) => {
    const { id } = req.params;
    const parsedUrl = parse(req.url!, true);

    if (!id) return app.render404(req, res, parsedUrl);
    if (id === '') return app.render404(req, res, parsedUrl);
    if (id === 'dashboard') return app.render(req, res, '/dashboard');

    const file = await prisma.file.findFirst({
      where: {
        name: id,
      },
    });

    if (!file) return app.render404(req, res, parsedUrl);

    const stream = await datasource.get(file.name);
    if (!stream) return app.render404(req, res, parsedUrl);

    if (!file.type && config.files.assumeMimetypes) {
      const ext = extname(file.name);
      const mime = await guess(ext);

      res.setHeader('Content-Type', mime);
    } else {
      res.setHeader('Content-Type', file.type);
    }

    res.setHeader('Content-Length', file.size);
    file.originalName && res.setHeader('Content-Disposition', `filename="${file.originalName}"`);

    stream.pipe(res);
  });

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
  });
}

main();
