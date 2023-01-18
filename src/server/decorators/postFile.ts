import { File } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

function postFileDecorator(fastify: FastifyInstance, _: unknown, done: () => void) {
  fastify.decorateReply('postFile', postFile);
  done();

  async function postFile(this: FastifyReply, file: File) {
    if (!file) return true;

    const nFile = await this.server.prisma.file.update({
      where: { id: file.id },
      data: { views: { increment: 1 } },
    });

    if (nFile.maxViews && nFile.views >= nFile.maxViews) {
      await this.server.datasource.delete(file.name);
      await this.server.prisma.file.delete({ where: { id: nFile.id } });

      this.server.logger
        .child('file')
        .info(`File ${file.name} has been deleted due to max views (${nFile.maxViews})`);

      return true;
    }
  }
}

export default fastifyPlugin(postFileDecorator, {
  name: 'postFile',
  decorators: {
    fastify: ['prisma', 'datasource', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    postFile: (file: File) => Promise<boolean>;
  }
}
