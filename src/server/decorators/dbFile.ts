import { File } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import exts from 'lib/exts';

function dbFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('dbFile', dbFile);
  done();

  async function dbFile(this: FastifyReply, file: File) {
    const ext = file.name.split('.').pop();
    if (Object.keys(exts).includes(ext)) return this.server.nextHandle(this.request.raw, this.raw);

    const data = await this.server.datasource.get(file.name);
    if (!data) return this.notFound();

    const size = await this.server.datasource.size(file.name);

    this.header('Content-Length', size);
    this.header('Content-Type', file.mimetype);
    return this.send(data);
  }
}

export default fastifyPlugin(dbFileDecorator, {
  name: 'dbFile',
  decorators: {
    fastify: ['prisma', 'datasource', 'nextHandle', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    dbFile: (file: File) => Promise<void>;
  }
}
