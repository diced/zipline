import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { migrations } from '../util';

async function prismaPlugin(fastify: FastifyInstance, _, done) {
  process.env.DATABASE_URL = fastify.config.core?.database_url;
  await migrations();

  const prisma = new PrismaClient();

  fastify.decorate('prisma', prisma);

  done();
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
