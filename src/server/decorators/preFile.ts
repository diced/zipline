import { Image } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

function preFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('preFile', preFile);
  done();

  async function preFile(this: FastifyReply, file: Image) {
    if (file.expires_at && file.expires_at < new Date()) {
      await this.server.datasource.delete(file.file);
      await this.server.prisma.image.delete({ where: { id: file.id } });

      this.server.logger.child('file').info(`File ${file.file} expired and was deleted.`);

      return true;
    }

    return false;
  }
}

export default fastifyPlugin(preFileDecorator, {
  name: 'preFile',
  decorators: {
    fastify: ['prisma', 'datasource', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    preFile: (file: Image) => Promise<boolean>;
  }
}
