import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { migrations } from 'server/util';

async function prismaPlugin(fastify: FastifyInstance) {
  process.env.DATABASE_URL = fastify.config.core?.database_url;
  await migrations();
  fastify.decorate('prisma', new PrismaClient());
  return;
}

export default fastifyPlugin(prismaPlugin, {
  name: 'prisma',
  fastify: '4.x',
  decorators: {
    fastify: ['config'],
  },
  dependencies: ['config'],
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
