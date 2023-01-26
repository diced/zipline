import { File } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

function preFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('preFile', preFile);
  done();

  async function preFile(this: FastifyReply, file: File) {
    if (file.expiresAt && file.expiresAt < new Date()) {
      await this.server.datasource.delete(file.name);
      await this.server.prisma.file.delete({ where: { id: file.id } });

      this.server.logger.child('file').info(`File ${file.name} expired and was deleted.`);

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
    preFile: (file: File) => Promise<boolean>;
  }
}
