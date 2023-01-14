import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import next from 'next';
import { NextServerOptions } from 'next/dist/server/next';

async function nextPlugin(fastify: FastifyInstance, options: NextServerOptions) {
  const nextServer = next(options);
  const handle = nextServer.getRequestHandler();

  fastify
    .decorate('nextServer', nextServer)
    .decorate('nextHandle', handle)
    .decorate('next', route.bind(fastify));

  return nextServer.prepare();

  function route(path, opts: any = { method: 'GET' }) {
    if (typeof opts.method === 'string') this[opts.method.toLowerCase()](path, opts, handler);
    else if (Array.isArray(opts.method)) {
      for (const method of opts.method) this[method.toLowerCase()](path, opts, handler);
    }

    async function handler(req: FastifyRequest, reply: FastifyReply) {
      for (const [key, value] of Object.entries(reply.getHeaders())) {
        reply.raw.setHeader(key, value);
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
    next: (path: string, opts?: { method: string | string[] }) => void;
    nextHandle: (req: IncomingMessage, res: OutgoingMessage | ServerResponse) => Promise<void>;
  }
}
