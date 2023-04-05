import { Url } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

function postUrlDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('postUrl', postUrl);
  done();

  async function postUrl(this: FastifyReply, url: Url) {
    if (!url) return true;

    const nUrl = await this.server.prisma.url.update({
      where: {
        id: url.id,
      },
      data: {
        views: { increment: 1 },
      },
    });

    if (nUrl.maxViews && nUrl.views >= nUrl.maxViews) {
      await this.server.prisma.url.delete({
        where: {
          id: nUrl.id,
        },
      });

      this.server.logger.child('url').info(`url deleted due to max views ${JSON.stringify(nUrl)}`);
    }
  }
}

export default fastifyPlugin(postUrlDecorator, {
  name: 'postUrl',
  decorators: {
    fastify: ['prisma', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    postUrl: (url: Url) => Promise<void>;
  }
}
