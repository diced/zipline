import next from 'next';
import fastify from 'fastify';
import fastifyTypeorm from 'fastify-typeorm-plugin';
import fastifyCookies from 'fastify-cookie';
import fastifyMultipart from 'fastify-multipart';
import { bootstrap } from 'fastify-decorators';
import { Console } from './lib/logger';
import { AddressInfo } from 'net';
import { ConsoleFormatter } from './lib/ConsoleFormatter';
import { bold, green, reset } from '@dicedtomato/colors';
import { Configuration } from './lib/Config';
import { UserController } from './controllers/UserController';
import { RootController } from './controllers/RootController';

Console.setFormatter(new ConsoleFormatter());

const config = Configuration.readConfig();
if (!config) process.exit(0);

const server = fastify({});
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, quiet: dev });
const handle = app.getRequestHandler();

Console.logger('Next').info('Preparing app');
app.prepare();

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

server.register(fastifyMultipart);

server.register(fastifyTypeorm, {
  ...config.database,
  entities: [dev ? './src/entities/**/*.ts' : './dist/entities/**/*.js'],
  synchronize: true,
  logging: false,
});

server.register(bootstrap, {
  controllers: [UserController, RootController],
});

server.register(fastifyCookies, {
  secret: config.core.secret,
});

server.listen(config.core.port, err => {
  if (err) throw err;
  const info = server.server.address() as AddressInfo;
  Console.logger('Server').info(
    `server listening on ${bold(
      `${green(info.address)}${reset(':')}${bold(green(info.port.toString()))}`
    )}`
  );
});
