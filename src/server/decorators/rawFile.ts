import { FastifyInstance, FastifyReply } from 'fastify';
import { guess } from 'lib/mimes';
import { extname } from 'path';
import fastifyPlugin from 'fastify-plugin';

function rawFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('rawFile', rawFile);
  done();

  async function rawFile(this: FastifyReply, id: string) {
    const data = await this.server.datasource.get(id);
    if (!data) return this.notFound();

    const mimetype = await guess(extname(id).slice(1));
    const size = await this.server.datasource.size(id);

    this.header('Content-Length', size);
    this.header('Content-Type', mimetype);
    return this.send(data);
  }
}

export default fastifyPlugin(rawFileDecorator, {
  name: 'rawFile',
  decorators: {
    fastify: ['datasource', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    rawFile: (id: string) => Promise<void>;
  }
}
