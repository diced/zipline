import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

function notFound(fastify: FastifyInstance, _: unknown, done: () => void) {
  fastify.decorateReply('notFound', notFound);
  done();

  function notFound(this: FastifyReply) {
    if (process.env.NODE_ENV == 'development') return this.code(404).send('not found :(');
    if (this.server.config.features.headless) return this.callNotFound();
    return this.server.nextServer.render404(this.request.raw, this.raw);
  }
}

export default fastifyPlugin(notFound, {
  name: 'notFound',
  fastify: '4.x',
  decorators: {
    fastify: ['config', 'nextServer'],
  },
  dependencies: ['config', 'next'],
});

declare module 'fastify' {
  interface FastifyReply {
    notFound: () => void;
  }
}
