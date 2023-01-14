import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { IncomingMessage } from 'http';

function allRoutes(fastify: FastifyInstance, _: unknown, done: () => void) {
  // overrides fastify's default parser so that next.js can handle the request
  // in the future Zipline's api will probably be entirely handled by fastify
  async function parser(_: FastifyRequest, payload: IncomingMessage) {
    return payload;
  }

  fastify.addContentTypeParser('text/plain', parser);
  fastify.addContentTypeParser('application/json', parser);
  fastify.addContentTypeParser('multipart/form-data', parser);

  fastify.next('/*', { method: 'ALL' });
  fastify.next('/api/*', { method: 'ALL' });

  done();
}

export default fastifyPlugin(allRoutes, {
  name: 'all',
  fastify: '4.x',
  dependencies: ['config', 'logger', 'prisma', 'next'],
});
