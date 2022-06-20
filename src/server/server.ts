import Router from 'find-my-way';
import { NextServer, RequestHandler } from 'next/dist/server/next';
import { Image, PrismaClient } from '@prisma/client';
import { createServer, IncomingMessage, OutgoingMessage, Server as HttpServer, ServerResponse } from 'http';
import next from 'next';
import config from '../lib/config';
import datasource from '../lib/datasource';
import { getStats, log, migrations } from './util';
import { mkdir } from 'fs/promises';
import Logger from '../lib/logger';
import mimes from '../../scripts/mimes';
import { extname } from 'path';
import exts from '../../scripts/exts';

const serverLog = Logger.get('server');

export default class Server {
  public router: Router.Instance<Router.HTTPVersion.V1>;
  public nextServer: NextServer;
  public handle: RequestHandler;
  public prisma: PrismaClient;

  private http: HttpServer;

  public constructor() {
    this.start();
  }

  private async start() {
    // annoy user if they didnt change secret from default "changethis"
    if (config.core.secret === 'changethis') {
      serverLog.error('Secret is not set!');
      serverLog.error('Running Zipline as is, without a randomized secret is not recommended and leaves your instance at risk!');
      serverLog.error('Please change your secret in the config file or environment variables.');
      serverLog.error('The config file is located at `config.toml`, or if using docker-compose you can change the variables in the `docker-compose.yml` file.');
      serverLog.error('It is recomended to use a secret that is alphanumeric and randomized. A way you can generate this is through a password manager you may have.');
      process.exit(1);
    };

    const dev = process.env.NODE_ENV === 'development';

    process.env.DATABASE_URL = config.core.database_url;
    await migrations();

    this.prisma = new PrismaClient();

    if (config.datasource.type === 'local') {
      await mkdir(config.datasource.local.directory, { recursive: true });
    }

    this.nextServer = next({
      dir: '.',
      dev,
      quiet: !dev,
      hostname: config.core.host,
      port: config.core.port,
    });

    this.handle = this.nextServer.getRequestHandler();
    this.router = Router({
      defaultRoute: (req, res) => {
        this.handle(req, res);
      },
    });

    this.router.on('GET', config.uploader.route === '/' ? '/:id(^[^\\.]+\\.[^\\.]+)' : `${config.uploader.route}/:id`, async (req, res, params) => {
      const image = await this.prisma.image.findFirst({
        where: {
          OR: [
            { file: params.id },
            { invisible: { invis: decodeURI(params.id) } },
          ],
        },
      });
      console.log(image);

      if (!image) await this.rawFile(req, res, params.id);

      if (image.password) await this.handle(req, res);
      else if (image.embed) await this.handle(req, res);
      else await this.fileDb(req, res, image);
    });

    this.router.on('GET', '/r/:id', async (req, res, params) => {
      const image = await this.prisma.image.findFirst({
        where: {
          OR: [
            { file: params.id },
            { invisible: { invis: decodeURI(params.id) } },
          ],
        },
      });

      if (!image) await this.rawFile(req, res, params.id);

      if (image.password) await this.handle(req, res);
      else await this.rawFileDb(req, res, image);
    });

    await this.nextServer.prepare();

    this.http = createServer((req, res) => {
      this.router.lookup(req, res);
      if (config.core.logger) log(req.url);
    });

    this.http.on('error', (e) => {
      serverLog.error(e);
      process.exit(1);
    });

    this.http.on('listening', () => {
      serverLog.info(`listening on ${config.core.host}:${config.core.port}`);
    });

    this.http.listen(config.core.port, config.core.host ?? '0.0.0.0');

    this.stats();
  }

  private async rawFile(req: IncomingMessage, res: OutgoingMessage, id: string) {
    const data = datasource.get(id);
    if (!data) return this.nextServer.render404(req, res as ServerResponse);
    const mimetype = mimes[extname(id)] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mimetype);

    data.pipe(res);
    data.on('error', () => this.nextServer.render404(req, res as ServerResponse));
    data.on('end', () => res.end());
  }

  private async rawFileDb(req: IncomingMessage, res: OutgoingMessage, image: Image) {
    const data = datasource.get(image.file);
    if (!data) return this.nextServer.render404(req, res as ServerResponse);

    res.setHeader('Content-Type', image.mimetype);
    data.pipe(res);
    data.on('error', () => this.nextServer.render404(req, res as ServerResponse));
    data.on('end', () => res.end());

    await this.prisma.image.update({
      where: { id: image.id },
      data: { views: { increment: 1 } },
    });
  }

  private async fileDb(req: IncomingMessage, res: OutgoingMessage, image: Image) {
    const ext = image.file.split('.').pop();
    if (Object.keys(exts).includes(ext)) return this.handle(req, res as ServerResponse);

    const data = datasource.get(image.file);
    if (!data) return this.nextServer.render404(req, res as ServerResponse);

    res.setHeader('Content-Type', image.mimetype);
    data.pipe(res);
    data.on('error', () => this.nextServer.render404(req, res as ServerResponse));
    data.on('end', () => res.end());

    await this.prisma.image.update({
      where: { id: image.id },
      data: { views: { increment: 1 } },
    });
  }

  private async stats() {
    const stats = await getStats(this.prisma, datasource);
    await this.prisma.stats.create({
      data: {
        data: stats,
      },
    });

    setInterval(async () => {
      const stats = await getStats(this.prisma, datasource);
      await this.prisma.stats.create({
        data: {
          data: stats,
        },
      });
      if (config.core.logger) serverLog.info('stats updated');
    }, config.core.stats_interval * 1000);
  }
}