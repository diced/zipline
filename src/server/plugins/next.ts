import { FastifyInstance, FastifyReply, FastifyRequest, HTTPMethods } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import next from 'next';
import { NextServerOptions, RequestHandler } from 'next/dist/server/next';

export const ALL_METHODS: HTTPMethods[] = [
  'DELETE',
  'GET',
  'HEAD',
  'PATCH',
  'POST',
  'PUT',
  // 'OPTIONS',
  'COPY',
  'MOVE',
  'TRACE',
];

async function nextPlugin(fastify: FastifyInstance, options: NextServerOptions) {
  const nextServer = next(options);
  const handle = nextServer.getRequestHandler();

  fastify
    .decorate('nextServer', nextServer)
    .decorate('nextHandle', handle)
    .decorate('next', route.bind(fastify));

  return nextServer.prepare();

  function route(this: FastifyInstance, path: string, method: HTTPMethods | HTTPMethods[] = 'GET') {
    this.route({
      method,
      url: path,
      handler,
    });

    async function handler(req: FastifyRequest, reply: FastifyReply) {
      for (const [key, value] of Object.entries(reply.getHeaders())) {
        if (value !== undefined) reply.raw.setHeader(key, value);
      }

      await handle(req.raw, reply.raw);

      reply.hijack();
    }
  }
}

export default fastifyPlugin(nextPlugin, {
  name: 'next',
  fastify: '4.x',
});

declare module 'fastify' {
  interface FastifyInstance {
    nextServer: ReturnType<typeof next>;
    next: (path: string, method?: HTTPMethods | HTTPMethods[]) => void;
    nextHandle: RequestHandler;
  }
}
