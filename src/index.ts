import next from 'next';
import { textSync as text } from 'figlet';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import fastifyTypeorm from 'fastify-typeorm-plugin';
import fastifyCookies from 'fastify-cookie';
import fastifyMultipart from 'fastify-multipart';
import fastifyRateLimit from 'fastify-rate-limit';
import fastifyStatic from 'fastify-static';
import fastifyFavicon from 'fastify-favicon';
import { bootstrap } from 'fastify-decorators';
import { Console } from './lib/logger';
import { AddressInfo } from 'net';
import { magenta, bold, green, reset, blue, red } from '@dicedtomato/colors';
import { Configuration } from './lib/Config';
import { UserController } from './lib/api/controllers/UserController';
import { RootController } from './lib/api/controllers/RootController';
import { join } from 'path';
import { ImagesController } from './lib/api/controllers/ImagesController';
import { URLSController } from './lib/api/controllers/URLSController';
import { checkVersion } from './lib/Util';
import { existsSync, readFileSync } from 'fs';
import { Image } from './lib/entities/Image';
import { User } from './lib/entities/User';
import { Zipline } from './lib/entities/Zipline';
import { URL } from './lib/entities/URL';
import { MultiFactorController } from './lib/api/controllers/MultiFactorController';
const dev = process.env.NODE_ENV !== 'production';

(async () => {
  if (await checkVersion())
    Console.logger('Zipline').info(
      'running an outdated version of zipline, please update soon!'
    );
})();

console.log(`
${magenta(text('Zipline'))}

Version : ${blue(
    process.env.npm_package_version ||
    JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
      .version
  )}
GitHub  : ${blue('https://github.com/ZiplineProject/zipline')}
Issues  : ${blue('https://github.com/ZiplineProject/zipline/issues')}
Docs    : ${blue('https://zipline.diced.wtf/')}
Mode    : ${bold(dev ? red('dev') : green('production'))}
Verbose : ${bold(process.env.VERBOSE ? red('yes') : green('no'))}
`);

Console.logger(Configuration).verbose('searching for config...');
const config = Configuration.readConfig();
if (!config) {
  Console.logger(Configuration).error(
    `could not find a Zipline.toml file in ${process.cwd()}`
  );
  process.exit(0);
}

const dir = config.uploader.directory ? config.uploader.directory : 'uploads';
const path = dir.charAt(0) == '/' ? dir : join(process.cwd(), dir);

const server = fastify({});
const app = next({
  dev,
  quiet: dev
});
const handle = app.getRequestHandler();

Console.logger(next).info('Preparing app...');
app.prepare();
Console.logger(next).verbose('Prepared app');

server.register(fastifyRateLimit, {
  timeWindow: 5000,
  max: 1,
  global: false
});

if (dev)
  server.get('/_next/*', async (req, reply) => {
    await handle(req.raw, reply.raw);
    return (reply.sent = true);
  });

server.all('/*', async (req, reply) => {
  await handle(req.raw, reply.raw);
  return (reply.sent = true);
});

server.setNotFoundHandler(async (req, reply) => {
  await app.render404(req.raw, reply.raw);
  return (reply.sent = true);
});

server.get(`${config.urls.route}/:id`, async function (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const urls = this.orm.getRepository(URL);

  const urlId = await urls.findOne({
    where: {
      id: req.params.id
    }
  });

  const urlVanity = await urls.findOne({
    where: {
      vanity: req.params.id
    }
  });

  if (config.urls.vanity && urlVanity) return reply.redirect(urlVanity.url);
  if (!urlId) {
    await app.render404(req.raw, reply.raw);
    return (reply.sent = true);
  }
  return reply.redirect(urlId.url);
});

server.get(`${config.uploader.rich_content_route || '/a'}/:id`, async function (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  if (!existsSync(join(config.uploader.directory, req.params.id))) {
    await app.render404(req.raw, reply.raw);
    return (reply.sent = true);
  }

  return reply.type('text/html').send(`
  <html>
  <head>
      <meta property="theme-color" content="${config.meta.color}">
      <meta property="og:title" content="${req.params.id}">
      <meta property="og:url" content="${config.uploader.route}/${req.params.id}">
      <meta property="og:image" content="${config.uploader.route}/${req.params.id}">
      <meta property="twitter:card" content="summary_large_image">
  </head>
  <body>
    <div style="text-align:center;vertical-align:middle;">
      <img src="${config.uploader.route}/${req.params.id}" >
    </div>
  </body>
  </html>
  `);
});

server.register(fastifyMultipart);

server.register(fastifyTypeorm, {
  ...config.database,
  entities: [Image, URL, User, Zipline],
  synchronize: true,
  logging: false
});

server.register(bootstrap, {
  controllers: [
    UserController,
    RootController,
    ImagesController,
    URLSController,
    MultiFactorController
  ]
});

server.register(fastifyCookies, {
  secret: config.core.secret
});

server.register(fastifyStatic, {
  root: path,
  prefix: config.uploader.route
});

server.register(fastifyStatic, {
  root: join(process.cwd(), 'public'),
  prefix: '/public',
  decorateReply: false
});

server.register(fastifyFavicon);

server.listen(
  {
    port: config.core.port,
    host: config.core.host
  },
  err => {
    if (err) throw err;
    const info = server.server.address() as AddressInfo;

    Console.logger('Server').info(
      `server listening on ${bold(
        `${green(info.address)}${reset(':')}${bold(
          green(info.port.toString())
        )}`
      )}`
    );
  }
);

server.addHook('preHandler', async (req, reply) => {
  if (
    config.core.blacklisted_ips &&
    config.core.blacklisted_ips.includes(req.ip)
  ) {
    await app.render404(req.raw, reply.raw);
    return (reply.sent = true);
  }
});