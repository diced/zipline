import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import Logger from '../../lib/logger';

function loggerPlugin(fastify: FastifyInstance, _: unknown, done: () => void) {
  fastify.decorate('logger', Logger.get('server'));

  done();
}

export default fastifyPlugin(loggerPlugin, {
  name: 'logger',
  fastify: '4.x',
});

declare module 'fastify' {
  interface FastifyInstance {
    logger: Logger;
  }
}
