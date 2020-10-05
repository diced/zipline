import next from 'next';
import fastify from 'fastify';
import fastifyMongodb from 'fastify-mongodb';
import fastifyCookies from 'fastify-cookie';
import { bootstrap } from 'fastify-decorators';
import { UserController } from './controllers/UserController';
import { Console } from './lib/logger';
import { AddressInfo } from 'net';
import { ConsoleFormatter } from './lib/ConsoleFormatter';
import { bold, green, reset } from '@dicedtomato/colors';
import { Config, Configuration } from './lib/Config';

Console.setFormatter(new ConsoleFormatter());

const config = Configuration.readConfig();
if (!config) process.exit(0);
const server = fastify({});
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, quiet: dev });
const handle = app.getRequestHandler();

Console.logger("Next").info(`Preparing app`);
app.prepare();

if (dev) server.get('/_next/*', (req, reply) => {
  return handle(req.raw, reply.raw).then(() => reply.sent = true);
});

server.all('/*', (req, reply) => {
  return handle(req.raw, reply.raw).then(() => reply.sent = true);
});

server.setNotFoundHandler((req, reply) => {
  return app.render404(req.raw, reply.raw).then(() => reply.sent = true);
})

server.register(bootstrap, {
  controllers: [
    UserController
  ],
});

server.register(fastifyMongodb, {
  forceClose: true,
  url: config.mongo.url,
  database: config.mongo.database
});

server.register(fastifyCookies, {
  secret: config.core.secret
});


server.listen(config.core.port, err => {
  if (err) throw err;
  const info = server.server.address() as AddressInfo;
  Console.logger("Server").info(`server listening on ${bold(`${green(info.address)}${reset(":")}${bold(green(info.port.toString()))}`)}`)
}) 
