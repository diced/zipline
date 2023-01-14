import { Image } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import exts from 'lib/exts';

function dbFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('dbFile', dbFile);
  done();

  async function dbFile(this: FastifyReply, image: Image) {
    const ext = image.file.split('.').pop();
    if (Object.keys(exts).includes(ext)) return this.server.nextHandle(this.request.raw, this.raw);

    const data = await this.server.datasource.get(image.file);
    if (!data) return this.notFound();

    const size = await this.server.datasource.size(image.file);

    this.header('Content-Length', size);
    this.header('Content-Type', image.mimetype);
    this.header(
      'Content-Disposition',
      `inline; name="${image.ogFile ?? image.file}" filename="${image.file}"`
    );
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
    dbFile: (image: Image) => Promise<void>;
  }
}
