import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Datasource } from '../../lib/datasources';

function datasourcePlugin(fastify: FastifyInstance, datasource: Datasource, done: () => void) {
  fastify.decorate('datasource', datasource);
  done();
}

export default fastifyPlugin(datasourcePlugin, {
  name: 'datasource',
  fastify: '4.x',
});

declare module 'fastify' {
  interface FastifyInstance {
    datasource: Datasource;
  }
}
